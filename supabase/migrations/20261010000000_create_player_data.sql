-- Player data ingested from Sleeper by the scripts under data/. Every table is
-- readable by signed-in users and written only by the service role (the
-- ingestion scripts), so none of them has insert/update/delete policies.

-- One row per Sleeper player (including retired ones and team defenses).
create table public.players (
  player_id text primary key,
  full_name text not null,
  first_name text,
  last_name text,
  position text,
  fantasy_positions text[],
  -- Current team only. Per-week teams live in player_week_stats.
  team text,
  status text,
  injury_status text,
  active boolean not null,
  birth_date date,
  college text,
  years_exp smallint,
  jersey_number smallint,
  -- Sleeper sends height as "71" or 6'2"; we store parsed inches.
  height_in smallint,
  weight_lb smallint,
  -- Outside ids are text: Sleeper mixes JSON numbers and strings.
  -- gsis_id is not unique in Sleeper's data, so it is indexed only.
  gsis_id text,
  espn_id text,
  yahoo_id text,
  sportradar_id text,
  -- Untouched Sleeper payload, so new columns can be derived without a refetch.
  raw jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index players_gsis_id_idx on public.players (gsis_id);

-- NFL schedule, one row per game.
create table public.nfl_games (
  game_id text primary key,
  season smallint not null,
  season_type text not null check (season_type in ('regular', 'post')),
  week smallint not null check (week >= 1),
  game_date date,
  home text not null,
  away text not null,
  -- Free text: Sleeper's values (complete, postponed, canceled, ...) are not
  -- a closed set.
  status text,
  updated_at timestamptz not null default now()
);

create index nfl_games_season_week_idx
  on public.nfl_games (season, season_type, week);

-- One row per player per NFL week.
-- participation says why the row exists:
--   played   - the player has a stat line (gp = 1)
--   inactive - the player's team played but he did not; from a Sleeper stub
--              row or inferred from the schedule
--   bye      - the player's team had no game that week
-- team_inferred marks rows whose team was copied from a neighbouring week
-- because Sleeper gave none.
create table public.player_week_stats (
  player_id text not null
    references public.players (player_id) on delete cascade,
  season smallint not null,
  season_type text not null check (season_type in ('regular', 'post')),
  week smallint not null check (week >= 1),
  participation text not null
    check (participation in ('played', 'inactive', 'bye')),
  team text not null,
  team_inferred boolean not null default false,
  opponent text,
  game_id text references public.nfl_games (game_id),
  game_date date,
  -- Often missing even on played rows, hence nullable.
  pts_std numeric,
  pts_half_ppr numeric,
  pts_ppr numeric,
  stats jsonb,
  updated_at timestamptz not null default now(),
  primary key (player_id, season, season_type, week),
  constraint player_week_stats_bye_empty check (
    participation <> 'bye'
    or (opponent is null and game_id is null and stats is null)
  ),
  constraint player_week_stats_stats_only_played check (
    participation = 'played' or stats is null
  ),
  -- A played row always comes from Sleeper with its real team.
  constraint player_week_stats_played_not_inferred check (
    participation <> 'played' or not team_inferred
  )
);

create index player_week_stats_season_week_idx
  on public.player_week_stats (season, season_type, week);
create index player_week_stats_game_id_idx
  on public.player_week_stats (game_id);

-- Internal log of ingestion runs. Not readable by signed-in users.
create table public.sync_runs (
  id bigint generated always as identity primary key,
  job text not null,
  args jsonb not null default '{}',
  status text not null check (status in ('running', 'succeeded', 'failed')),
  rows_written integer not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index sync_runs_job_started_at_idx
  on public.sync_runs (job, started_at desc);

-- Season totals per player, derived so they can never drift from the weekly
-- rows.
-- security_invoker makes the view obey the caller's RLS on player_week_stats.
create view public.player_season_totals
with (security_invoker = true) as
select
  player_id,
  season,
  season_type,
  count(*) filter (where participation = 'played') as games_played,
  count(*) filter (where participation = 'inactive') as weeks_inactive,
  count(*) filter (where participation = 'bye') as weeks_bye,
  sum(pts_std) filter (where participation = 'played') as pts_std,
  sum(pts_half_ppr) filter (where participation = 'played') as pts_half_ppr,
  sum(pts_ppr) filter (where participation = 'played') as pts_ppr
from public.player_week_stats
group by player_id, season, season_type;

alter table public.players enable row level security;
alter table public.nfl_games enable row level security;
alter table public.player_week_stats enable row level security;
alter table public.sync_runs enable row level security;

-- Privileges: signed-in users read, the service role writes. service_role is
-- granted explicitly instead of relying on the default exposure of new tables.
revoke all on table public.players from anon, authenticated;
revoke all on table public.nfl_games from anon, authenticated;
revoke all on table public.player_week_stats from anon, authenticated;
revoke all on table public.sync_runs from anon, authenticated;
revoke all on table public.player_season_totals from anon, authenticated;

grant select on table public.players to authenticated;
grant select on table public.nfl_games to authenticated;
grant select on table public.player_week_stats to authenticated;
grant select on table public.player_season_totals to authenticated;

grant select, insert, update, delete on table public.players to service_role;
grant select, insert, update, delete on table public.nfl_games to service_role;
grant select, insert, update, delete on table public.player_week_stats
  to service_role;
grant select, insert, update, delete on table public.sync_runs to service_role;
grant select on table public.player_season_totals to service_role;
grant usage, select on sequence public.sync_runs_id_seq to service_role;

-- RLS policies. sync_runs has none: only the service role (which bypasses
-- RLS) uses it.
create policy "Signed-in users can read players"
  on public.players
  for select
  to authenticated
  using (true);

create policy "Signed-in users can read nfl games"
  on public.nfl_games
  for select
  to authenticated
  using (true);

create policy "Signed-in users can read player week stats"
  on public.player_week_stats
  for select
  to authenticated
  using (true);

-- Keep updated_at current on every update (function defined in
-- create_profiles).
create trigger set_players_updated_at
  before update on public.players
  for each row
  execute function public.set_updated_at();

create trigger set_nfl_games_updated_at
  before update on public.nfl_games
  for each row
  execute function public.set_updated_at();

create trigger set_player_week_stats_updated_at
  before update on public.player_week_stats
  for each row
  execute function public.set_updated_at();
