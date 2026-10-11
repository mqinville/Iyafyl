-- Player search for the header typeahead: accent- and punctuation-insensitive
-- substring match on the player name, backed by a trigram index.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- "D.J. Moore" -> "dj moore", "Ja'Marr Chase" -> "jamarr chase". Keeps only
-- [a-z0-9 ], so LIKE wildcards in user input (% _ \) vanish and need no
-- escaping. Declared immutable so it can back an index; unaccent itself is
-- only stable, but the dictionary is fixed here.
create function public.normalize_player_name(name text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select trim(regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, name)),
    '[^a-z0-9 ]+',
    '',
    'g'
  ))
$$;

-- Serves substring matches of 3+ characters (trigrams); 2-character terms fall
-- back to a scan, which is fine at ~12k rows.
create index players_search_name_trgm_idx
  on public.players
  using gin (public.normalize_player_name(full_name) extensions.gin_trgm_ops);

-- Up to `lim` (1-20) players matching q, best first: prefix matches on full or
-- last name, then Sleeper's search_rank (its popularity order, lower is more
-- relevant; 9999999 for obscure players), then active players, then
-- fantasy-relevant positions, then trigram similarity. Runs as the caller, so
-- players RLS still applies.
create function public.search_players(q text, lim int default 8)
returns table (
  player_id text,
  full_name text,
  "position" text,
  team text,
  active boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with term as (select public.normalize_player_name(q) as t)
  select p.player_id, p.full_name, p."position", p.team, p.active
  from public.players p, term
  where length(term.t) >= 2
    and public.normalize_player_name(p.full_name) like '%' || term.t || '%'
  order by
    coalesce(
      public.normalize_player_name(p.full_name) like term.t || '%'
      or public.normalize_player_name(p.last_name) like term.t || '%',
      false
    ) desc,
    case
      when p.raw ->> 'search_rank' ~ '^[0-9]+$'
        then (p.raw ->> 'search_rank')::int
    end asc nulls last,
    p.active desc,
    coalesce(p."position" in ('QB', 'RB', 'WR', 'TE', 'K', 'DEF'), false) desc,
    extensions.similarity(public.normalize_player_name(p.full_name), term.t) desc,
    p.full_name
  limit least(greatest(lim, 1), 20)
$$;

revoke execute on function public.normalize_player_name(text) from public, anon;
revoke execute on function public.search_players(text, int) from public, anon;
grant execute on function public.normalize_player_name(text) to authenticated;
grant execute on function public.search_players(text, int) to authenticated;
