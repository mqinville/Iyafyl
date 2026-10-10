import "server-only"

import { PLAYER_SEARCH_MIN_LENGTH } from "@/lib/player-search"
import { createClient } from "@/lib/supabase/server"
import type { PlayerSearchResult } from "@/lib/types"

const MAX_QUERY_LENGTH = 50
const RESULT_LIMIT = 8
const SLEEPER_CDN = "https://sleepercdn.com"

// Team defenses use the team abbreviation as their player id and have a logo,
// not a headshot. Players without a photo get a 403; the client falls back.
function playerImageUrl(playerId: string, position: string | null): string {
  if (position === "DEF") {
    return `${SLEEPER_CDN}/images/team_logos/nfl/${playerId.toLowerCase()}.png`
  }
  return `${SLEEPER_CDN}/content/nfl/players/thumb/${playerId}.jpg`
}

export type PlayerSearchOutcome =
  | { status: "ok"; results: PlayerSearchResult[] }
  | { status: "unauthorized" }
  | { status: "unavailable" }

export async function searchPlayers(
  query: string,
): Promise<PlayerSearchOutcome> {
  const supabase = await createClient()
  if (!supabase) {
    return { status: "unavailable" }
  }

  // Deliberate defense in depth: the proxy gate is a no-op without env and
  // route handlers are reachable directly.
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) {
    return { status: "unauthorized" }
  }

  const q = query.trim().slice(0, MAX_QUERY_LENGTH)
  if (q.length < PLAYER_SEARCH_MIN_LENGTH) {
    return { status: "ok", results: [] }
  }

  const { data, error } = await supabase.rpc("search_players", {
    q,
    lim: RESULT_LIMIT,
  })
  if (error) {
    console.error("Player search failed", error)
    return { status: "unavailable" }
  }

  return {
    status: "ok",
    results: data.map((row) => ({
      id: row.player_id,
      name: row.full_name,
      position: row.position ?? null,
      team: row.team ?? null,
      active: row.active,
      imageUrl: playerImageUrl(row.player_id, row.position ?? null),
    })),
  }
}
