import { upsertRows } from "@/data/shared/db"
import type { RunContext } from "@/data/shared/runs"
import { fetchJson, SLEEPER_STATS_API } from "@/data/shared/sleeper"
import type { TablesInsert } from "@/lib/supabase/database.types"

import type { SleeperScheduleEntry } from "./sleeper-types"
import { fetchStatsWeek } from "./sleeper-stats"

export type SeasonType = "regular" | "post"

export const SEASON_TYPES: SeasonType[] = ["regular", "post"]

export type GameRow = TablesInsert<"nfl_games">

/** Games grouped by (season type, week, home, away); twins share a group. */
function groupByMatchup(games: GameRow[]): Map<string, GameRow[]> {
  const byMatchup = new Map<string, GameRow[]>()
  for (const game of games) {
    const key = `${game.season_type}|${game.week}|${game.home}|${game.away}`
    const group = byMatchup.get(key) ?? []
    group.push(game)
    byMatchup.set(key, group)
  }
  return byMatchup
}

export interface ResolvedGames {
  kept: GameRow[]
  /** Dropped twin id -> the kept id of the same game. */
  replacedBy: Map<string, string>
}

/**
 * Sleeper lists some STL and SD home games twice (2009-2011, 2015, 2016): an
 * id ending in "00" and a twin ending in "32" (STL) or "29" (SD). In 2009 and
 * 2010 stat rows use only the twin; in 2011, 2015 and 2016 every stat row of
 * the game comes twice, once per id. One id is kept per game: the one with the
 * most stat rows, the non-"00" id on a tie (also when nothing references
 * either, e.g. an unplayed game). Callers move rows on a dropped id to the
 * kept one with replacedBy. Games without a twin are always kept.
 */
export function resolveDuplicateGames(
  games: GameRow[],
  rowsPerGame: ReadonlyMap<string, number>,
): ResolvedGames {
  const replacedBy = new Map<string, string>()
  for (const group of groupByMatchup(games).values()) {
    if (group.length < 2) {
      continue
    }
    const score = (game: GameRow): number =>
      (rowsPerGame.get(game.game_id) ?? 0) * 2 +
      (game.game_id.endsWith("00") ? 0 : 1)
    const keep = group.reduce((best, game) =>
      score(game) > score(best) ? game : best,
    )
    for (const game of group) {
      if (game !== keep) {
        replacedBy.set(game.game_id, keep.game_id)
      }
    }
  }
  return {
    kept: games.filter((game) => !replacedBy.has(game.game_id)),
    replacedBy,
  }
}

export function logReplaced(replacedBy: ReadonlyMap<string, string>): void {
  if (replacedBy.size > 0) {
    const pairs = [...replacedBy].map(([from, to]) => `${from}->${to}`)
    const more = pairs.length > 5 ? `, … ${pairs.length - 5} more` : ""
    console.log(
      `  Merged ${replacedBy.size} duplicate game ids: ${pairs.slice(0, 5).join(", ")}${more}.`,
    )
  }
}

/**
 * Fetches one season's schedule for the given season types, minus canceled
 * placeholders (2025 post). Postponed games stay; they are real rows that
 * were rescheduled. Duplicate twins are kept: callers resolve them with
 * resolveDuplicateGames once they know which ids stat rows reference.
 *
 * WARNING: /schedule/nfl is an unofficial, undocumented Sleeper endpoint and
 * may change or break without notice.
 */
export async function fetchSchedule(
  season: number,
  seasonTypes: SeasonType[] = SEASON_TYPES,
): Promise<GameRow[]> {
  const games: GameRow[] = []
  let canceled = 0

  for (const seasonType of seasonTypes) {
    const entries = await fetchJson<SleeperScheduleEntry[]>(
      `${SLEEPER_STATS_API}/schedule/nfl/${seasonType}/${season}`,
    )
    for (const entry of entries) {
      if (entry.status === "canceled") {
        canceled++
        continue
      }
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
    `Schedule ${season}: ${games.length} games listed, ${canceled} canceled dropped.`,
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

/**
 * Deletes the season's stored games that are not in keep: twins saved by an
 * older run that picked the wrong one. Run it after the stat rows are
 * rewritten, since player_week_stats.game_id references nfl_games.
 */
export async function pruneGames(
  { client, dryRun }: RunContext,
  season: number,
  seasonTypes: SeasonType[],
  keep: GameRow[],
): Promise<void> {
  const { data, error } = await client
    .from("nfl_games")
    .select("game_id")
    .eq("season", season)
    .in("season_type", seasonTypes)
  if (error) {
    throw new Error(`Select from nfl_games failed: ${error.message}`)
  }
  const keepIds = new Set(keep.map((game) => game.game_id))
  const stale = data.map((row) => row.game_id).filter((id) => !keepIds.has(id))
  if (stale.length === 0) {
    return
  }
  if (dryRun) {
    console.log(
      `  Dry run: would delete ${stale.length} stale games: ${stale.join(", ")}.`,
    )
    return
  }
  const result = await client.from("nfl_games").delete().in("game_id", stale)
  if (result.error) {
    throw new Error(
      `Could not delete stale games ${stale.join(", ")}: ${result.error.message}. Stat rows probably still reference them; run \`stats --season ${season}\`, which rewrites those rows and is canonical.`,
    )
  }
  console.log(`  Deleted ${stale.length} stale games: ${stale.join(", ")}.`)
}

/**
 * The schedule-only job. Twins are resolved by fetching the stat weeks that
 * contain them. The `stats` job is canonical: it counts only rows it stores,
 * while this job counts every non-TEAM_ row. Sleeper's twins either tie or
 * have one side at zero, so both jobs keep the same id; if they ever
 * disagreed, pruneGames would fail on the foreign key rather than orphan rows.
 */
export async function syncSchedule(
  ctx: RunContext,
  season: number,
  seasonTypes: SeasonType[],
): Promise<number> {
  const games = await fetchSchedule(season, seasonTypes)
  const twinWeeks = new Map<string, [SeasonType, number]>()
  for (const group of groupByMatchup(games).values()) {
    if (group.length > 1) {
      const { season_type, week } = group[0]
      twinWeeks.set(`${season_type}|${week}`, [season_type as SeasonType, week])
    }
  }

  const rowsPerGame = new Map<string, number>()
  for (const [seasonType, week] of twinWeeks.values()) {
    for (const row of await fetchStatsWeek(season, seasonType, week)) {
      if (!row.player_id.startsWith("TEAM_")) {
        rowsPerGame.set(row.game_id, (rowsPerGame.get(row.game_id) ?? 0) + 1)
      }
    }
  }

  const { kept, replacedBy } = resolveDuplicateGames(games, rowsPerGame)
  logReplaced(replacedBy)
  const written = await saveGames(ctx, kept)
  await pruneGames(ctx, season, seasonTypes, kept)
  if (ctx.dryRun) {
    console.log("Dry run: nothing written.")
  }
  return written
}
