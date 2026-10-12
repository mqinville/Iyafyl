import "server-only"

import {
  MAIN_POSITIONS,
  RANKING_STAT_KEYS,
  RANKINGS_PAGE_SIZE,
  abbreviateName,
  type RankingStatKey,
  type RankingsParams,
} from "@/lib/rankings"
import { createClient } from "@/lib/supabase/server"

export interface RankingRow {
  id: string
  fullName: string
  // Abbreviated for the table ("K. Murray"); defenses keep the full name.
  name: string
  position: string | null
  // Current team.
  team: string | null
  active: boolean
  gp: number
  // Single-week mode only.
  opponent: string | null
  isHome: boolean | null
  weekTeam: string | null
  // Indexed by column key; null when the source has no value.
  stats: Record<RankingStatKey, number | null>
}

export type RankingsOutcome =
  | { status: "ok"; rows: RankingRow[]; total: number }
  | { status: "unauthorized" }
  | { status: "unavailable" }

// numeric columns can arrive as number or string; null stays null.
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

type SupabaseServerClient = NonNullable<
  Awaited<ReturnType<typeof createClient>>
>

// The server client when Supabase is configured and the viewer is signed in.
async function signedInClient(): Promise<
  | { status: "ok"; supabase: SupabaseServerClient }
  | { status: "unauthorized" | "unavailable" }
> {
  const supabase = await createClient()
  if (!supabase) {
    return { status: "unavailable" }
  }
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) {
    return { status: "unauthorized" }
  }
  return { status: "ok", supabase }
}

export async function getPlayerRankings(
  params: RankingsParams,
): Promise<RankingsOutcome> {
  const session = await signedInClient()
  if (session.status !== "ok") {
    return { status: session.status }
  }
  const { supabase } = session

  let positions: string[] | undefined
  let excludePositions = false
  if (params.position === "MORE") {
    positions = [...MAIN_POSITIONS]
    excludePositions = true
  } else if (params.position !== "ALL") {
    positions = [params.position]
  }

  const { data, error } = await supabase.rpc("player_rankings", {
    p_season: params.season,
    p_week: params.week ?? undefined,
    p_season_type: params.seasonType,
    p_positions: positions,
    p_exclude_positions: excludePositions,
    p_active: params.status === "active",
    p_search: params.search === "" ? undefined : params.search,
    p_sort: params.sort,
    p_dir: params.dir,
    p_flock_list: params.flockList,
    p_flock_creator: params.flockCreator ?? undefined,
    p_ranked_only: params.rankedOnly,
    lim: RANKINGS_PAGE_SIZE,
    off: (params.page - 1) * RANKINGS_PAGE_SIZE,
  })
  if (error) {
    console.error("Player rankings failed", error)
    return { status: "unavailable" }
  }

  const rows = data.map((row): RankingRow => {
    const record: Record<string, unknown> = row
    const stats = {} as Record<RankingStatKey, number | null>
    for (const key of RANKING_STAT_KEYS) {
      stats[key] = toNumber(record[key])
    }
    return {
      id: row.player_id,
      fullName: row.full_name,
      name: abbreviateName(
        row.full_name,
        row.first_name,
        row.last_name,
        row.position,
      ),
      position: row.position ?? null,
      team: row.team ?? null,
      active: row.active,
      gp: row.gp,
      opponent: row.opponent ?? null,
      isHome: row.is_home ?? null,
      weekTeam: row.week_team ?? null,
      stats,
    }
  })

  return {
    status: "ok",
    rows,
    total: toNumber(data[0]?.total_count) ?? 0,
  }
}

export interface FlockRankingSet {
  list: string
  creators: string[]
  fetchedAt: string
}

export async function getFlockRankingSets(): Promise<FlockRankingSet[]> {
  const session = await signedInClient()
  if (session.status !== "ok") {
    return []
  }
  const { supabase } = session

  const { data, error } = await supabase
    .from("flock_ranking_sets")
    .select("list, creators, fetched_at")
  if (error) {
    console.error("Flock ranking sets failed", error)
    return []
  }
  return data.map((row) => ({
    list: row.list,
    creators: row.creators,
    fetchedAt: row.fetched_at,
  }))
}
