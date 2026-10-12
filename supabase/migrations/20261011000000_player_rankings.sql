-- Player rankings: one row per player, aggregated from player_week_stats for a
-- whole season or a single week, sortable by any stat column.
--
-- Only `played` rows count. A missing stats key counts as 0. The point columns
-- come from the pts_* columns and stay null when Sleeper gave no points for
-- every counted game.
--
-- Defensive touchdowns use stats.def_td. The generic stats.td key is not used:
-- on DEF rows it shows up on ~94% of games with values that do not match the
-- pts_std math (a game with td = 4 and no def_td scored no touchdown points),
-- while def_td is present only on games that scored defensive TDs.
--
-- p_sort is checked against a whitelist and used through to_jsonb(), never
-- dynamic SQL.

create function public.player_rankings(
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
  off int default 0
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
    'sack', 'def_int', 'fum_rec', 'def_td', 'pts_allow'
  ]) then
    raise exception 'invalid sort key: %', p_sort using errcode = '22023';
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
      case when p_week is not null then max(s.team) end as week_team
    from public.player_week_stats s
    join public.players p on p.player_id = s.player_id
    left join public.nfl_games g on g.game_id = s.game_id
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
    r.opponent, r.is_home, r.week_team, r.total_count
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

revoke execute on function public.player_rankings(
  int, int, text, text[], boolean, boolean, text, text, text, int, int
) from public, anon;
grant execute on function public.player_rankings(
  int, int, text, text[], boolean, boolean, text, text, text, int, int
) to authenticated;
