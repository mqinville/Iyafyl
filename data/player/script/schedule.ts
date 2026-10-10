import { upsertRows } from "@/data/shared/db"
import type { RunContext } from "@/data/shared/runs"
import { fetchJson, SLEEPER_STATS_API } from "@/data/shared/sleeper"
import type { TablesInsert } from "@/lib/supabase/database.types"

import type { SleeperScheduleEntry } from "./sleeper-types"

export type SeasonType = "regular" | "post"

export const SEASON_TYPES: SeasonType[] = ["regular", "post"]

export type GameRow = TablesInsert<"nfl_games">

/**
 * Drops entries Sleeper lists but no stat row ever references:
 * - canceled placeholders (2025 post), and
 * - phantom duplicates: an id ending in "00" that shares (week, home, away)
 *   with another entry (2009/2010). The real game carries the other id.
 * Postponed games stay; they are real rows that were rescheduled.
 */
function dedupeGames(entries: SleeperScheduleEntry[]): {
  kept: SleeperScheduleEntry[]
  dropped: number
} {
  const matchupKey = (entry: SleeperScheduleEntry): string =>
    `${entry.week}|${entry.home}|${entry.away}`
  const counts = new Map<string, number>()
  for (const entry of entries) {
    counts.set(matchupKey(entry), (counts.get(matchupKey(entry)) ?? 0) + 1)
  }

  const kept = entries.filter((entry) => {
    if (entry.status === "canceled") {
      return false
    }
    const isPhantom =
      entry.game_id.endsWith("00") && (counts.get(matchupKey(entry)) ?? 0) > 1
    return !isPhantom
  })
  return { kept, dropped: entries.length - kept.length }
}

/**
 * Fetches and cleans one season's schedule for both season types.
 *
 * WARNING: /schedule/nfl is an unofficial, undocumented Sleeper endpoint and
 * may change or break without notice.
 */
export async function fetchSchedule(
  season: number,
  seasonTypes: SeasonType[] = SEASON_TYPES,
): Promise<GameRow[]> {
  const games: GameRow[] = []
  let dropped = 0

  for (const seasonType of seasonTypes) {
    const entries = await fetchJson<SleeperScheduleEntry[]>(
      `${SLEEPER_STATS_API}/schedule/nfl/${seasonType}/${season}`,
    )
    const result = dedupeGames(entries)
    dropped += result.dropped
    for (const entry of result.kept) {
      games.push({
        game_id: entry.game_id,
        season,
        season_type: seasonType,
        week: entry.week,
        game_date: entry.date,
        home: entry.home,
        away: entry.away,
        status: entry.status,
      })
    }
  }

  console.log(
    `Schedule ${season}: ${games.length} games kept, ${dropped} phantom/canceled dropped.`,
  )
  return games
}

/** Upserts games; a dry run writes nothing. */
export async function saveGames(
  { client, dryRun }: RunContext,
  games: GameRow[],
): Promise<number> {
  if (dryRun) {
    return 0
  }
  return upsertRows(client, "nfl_games", games, ["game_id"])
}

export async function syncSchedule(
  ctx: RunContext,
  season: number,
  seasonTypes: SeasonType[],
): Promise<number> {
  const games = await fetchSchedule(season, seasonTypes)
  const written = await saveGames(ctx, games)
  if (ctx.dryRun) {
    console.log("Dry run: nothing written.")
  }
  return written
}
