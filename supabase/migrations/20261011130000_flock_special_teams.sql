-- Flock ranks kickers and team defenses in a separate special-teams list.
-- For those rows each creator's overall rank equals the positional rank
-- (1-32), the overall tier is a placeholder (15/16) and the consensus
-- average_rank is null, so they must not show as overall #1, #2, ...
--
-- flock_rankings.is_special_teams records Flock's isSpecialTeams flag; the
-- creator rows stay as Flock sent them. player_rankings returns a null
-- flock_rank and flock_tier for those rows and keeps the positional rank, and
-- p_ranked_only counts a row as ranked when either rank is present. Same
-- signature and return table, so the existing grants persist.

alter table public.flock_rankings
  add column is_special_teams boolean not null default false;

comment on column public.flock_rankings.is_special_teams is
  'Flock ranks K and DEF in a separate special-teams list: creator overall ranks equal the positional rank and overall tiers are placeholders, so there is no real overall rank or tier.';

update public.flock_rankings
set is_special_teams = coalesce((raw ->> 'isSpecialTeams')::boolean, false);

create or replace function public.player_rankings(
  p_season int,
  p_week int default null,
  p_season_type text default 'regular',
  p_positions text[] default null,
  p_exclude_positions boolean default false,
  p_active boolean default true,
  p_search text default null,
  p_sort text default 'pts_ppr',
  p_dir text default 'desc',
  lim int default 50,
  off int default 0,
  p_flock_list text default 'REDRAFT',
  p_flock_creator text default null,
  p_ranked_only boolean default false
)
returns table (
  player_id text,
  full_name text,
  first_name text,
  last_name text,
  "position" text,
  team text,
  active boolean,
  gp int,
  pts_ppr numeric,
  pts_half_ppr numeric,
  pts_std numeric,
  rush_att numeric,
  rush_yd numeric,
  rush_td numeric,
  rec numeric,
  rec_tgt numeric,
  rec_yd numeric,
  rec_td numeric,
  pass_cmp numeric,
  pass_att numeric,
  pass_yd numeric,
  pass_td numeric,
  pass_int numeric,
  fgm numeric,
  fga numeric,
  xpm numeric,
  xpa numeric,
  sack numeric,
  def_int numeric,
  fum_rec numeric,
  def_td numeric,
  pts_allow numeric,
  opponent text,
  is_home boolean,
  week_team text,
  flock_rank numeric,
  flock_pos_rank numeric,
  flock_tier numeric,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_term text := public.normalize_player_name(coalesce(p_search, ''));
  v_lim int := least(greatest(coalesce(lim, 50), 1), 100);
  v_off int := greatest(coalesce(off, 0), 0);
begin
  if p_sort is null or p_sort <> all (array[
    'full_name', 'pts_ppr', 'pts_half_ppr', 'pts_std', 'gp',
    'rush_att', 'rush_yd', 'rush_td',
    'rec', 'rec_tgt', 'rec_yd', 'rec_td',
    'pass_cmp', 'pass_att', 'pass_yd', 'pass_td', 'pass_int',
    'fgm', 'fga', 'xpm', 'xpa',
    'sack', 'def_int', 'fum_rec', 'def_td', 'pts_allow',
    'flock_rank', 'flock_pos_rank', 'flock_tier'
  ]) then
    raise exception 'invalid sort key: %', p_sort using errcode = '22023';
  end if;
  if p_flock_list is null or p_flock_list not in ('REDRAFT', 'REDRAFT_SF') then
    raise exception 'invalid flock list: %', p_flock_list using errcode = '22023';
  end if;
  if p_dir is null or p_dir not in ('asc', 'desc') then
    raise exception 'invalid sort direction: %', p_dir using errcode = '22023';
  end if;

  return query
  with agg as (
    select
      p.player_id,
      p.full_name,
      p.first_name,
      p.last_name,
      p."position",
      p.team,
      p.active,
      count(*)::int as gp,
      sum(s.pts_ppr) as pts_ppr,
      sum(s.pts_half_ppr) as pts_half_ppr,
      sum(s.pts_std) as pts_std,
      sum(coalesce((s.stats ->> 'rush_att')::numeric, 0)) as rush_att,
      sum(coalesce((s.stats ->> 'rush_yd')::numeric, 0)) as rush_yd,
      sum(coalesce((s.stats ->> 'rush_td')::numeric, 0)) as rush_td,
      sum(coalesce((s.stats ->> 'rec')::numeric, 0)) as rec,
      sum(coalesce((s.stats ->> 'rec_tgt')::numeric, 0)) as rec_tgt,
      sum(coalesce((s.stats ->> 'rec_yd')::numeric, 0)) as rec_yd,
      sum(coalesce((s.stats ->> 'rec_td')::numeric, 0)) as rec_td,
      sum(coalesce((s.stats ->> 'pass_cmp')::numeric, 0)) as pass_cmp,
      sum(coalesce((s.stats ->> 'pass_att')::numeric, 0)) as pass_att,
      sum(coalesce((s.stats ->> 'pass_yd')::numeric, 0)) as pass_yd,
      sum(coalesce((s.stats ->> 'pass_td')::numeric, 0)) as pass_td,
      sum(coalesce((s.stats ->> 'pass_int')::numeric, 0)) as pass_int,
      sum(coalesce((s.stats ->> 'fgm')::numeric, 0)) as fgm,
      sum(coalesce((s.stats ->> 'fga')::numeric, 0)) as fga,
      sum(coalesce((s.stats ->> 'xpm')::numeric, 0)) as xpm,
      sum(coalesce((s.stats ->> 'xpa')::numeric, 0)) as xpa,
      sum(coalesce((s.stats ->> 'sack')::numeric, 0)) as sack,
      sum(coalesce((s.stats ->> 'int')::numeric, 0)) as def_int,
      sum(coalesce((s.stats ->> 'fum_rec')::numeric, 0)) as fum_rec,
      sum(coalesce((s.stats ->> 'def_td')::numeric, 0)) as def_td,
      sum(coalesce((s.stats ->> 'pts_allow')::numeric, 0)) as pts_allow,
      case when p_week is not null then max(s.opponent) end as opponent,
      case when p_week is not null then bool_or(g.home = s.team) end
        as is_home,
      case when p_week is not null then max(s.team) end as week_team,
      max(case
        when f.is_special_teams then null
        when p_flock_creator is null then f.average_rank
        else c.overall_rank::numeric end) as flock_rank,
      max(case when p_flock_creator is null
        then f.average_positional_rank
        else c.positional_rank::numeric end) as flock_pos_rank,
      max(case
        when f.is_special_teams then null
        when p_flock_creator is null then f.average_tier
        else c.overall_tier::numeric end) as flock_tier
    from public.player_week_stats s
    join public.players p on p.player_id = s.player_id
    left join public.nfl_games g on g.game_id = s.game_id
    left join public.flock_rankings f
      on f.list = p_flock_list and f.player_id = p.player_id
    left join public.flock_creator_rankings c
      on c.list = p_flock_list
      and c.creator = p_flock_creator
      and c.player_id = p.player_id
    where s.season = p_season
      and s.season_type = p_season_type
      and s.participation = 'played'
      and (p_week is null or s.week = p_week)
      and (p_active is null or p.active = p_active)
      and (
        p_positions is null
        or case
          when p_exclude_positions
            then p."position" is null or p."position" <> all (p_positions)
          else p."position" = any (p_positions)
        end
      )
      and (
        not p_ranked_only
        or coalesce(
          case when f.is_special_teams then null
            when p_flock_creator is null then f.average_rank
            else c.overall_rank::numeric end,
          case when p_flock_creator is null
            then f.average_positional_rank
            else c.positional_rank::numeric end
        ) is not null
      )
      and (
        length(v_term) < 2
        or public.normalize_player_name(p.full_name) like '%' || v_term || '%'
      )
    group by p.player_id
  ),
  ranked as (
    select a.*, count(*) over () as total_count
    from agg a
  )
  select
    r.player_id, r.full_name, r.first_name, r.last_name, r."position",
    r.team, r.active, r.gp, r.pts_ppr, r.pts_half_ppr, r.pts_std,
    r.rush_att, r.rush_yd, r.rush_td, r.rec, r.rec_tgt, r.rec_yd, r.rec_td,
    r.pass_cmp, r.pass_att, r.pass_yd, r.pass_td, r.pass_int,
    r.fgm, r.fga, r.xpm, r.xpa,
    r.sack, r.def_int, r.fum_rec, r.def_td, r.pts_allow,
    r.opponent, r.is_home, r.week_team,
    r.flock_rank, r.flock_pos_rank, r.flock_tier, r.total_count
  from ranked r
  order by
    case when p_sort <> 'full_name' and p_dir = 'asc'
      then (to_jsonb(r) ->> p_sort)::numeric end asc nulls last,
    case when p_sort <> 'full_name' and p_dir = 'desc'
      then (to_jsonb(r) ->> p_sort)::numeric end desc nulls last,
    case when p_sort = 'full_name' and p_dir = 'asc'
      then r.full_name end asc nulls last,
    case when p_sort = 'full_name' and p_dir = 'desc'
      then r.full_name end desc nulls last,
    r.full_name asc nulls last,
    r.player_id
  limit v_lim offset v_off;
end
$$;
