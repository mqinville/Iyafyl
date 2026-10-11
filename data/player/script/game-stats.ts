import type { SupabaseClient } from "@supabase/supabase-js"

import { upsertRows } from "@/data/shared/db"
import type { RunContext } from "@/data/shared/runs"
import type { Database } from "@/lib/supabase/database.types"

import { fillMissingWeeks, type WeekRow } from "./fill-weeks"
import {
  fetchSchedule,
  logReplaced,
  pruneGames,
  resolveDuplicateGames,
  SEASON_TYPES,
  saveGames,
  type SeasonType,
} from "./schedule"
import { fetchStatsWeek } from "./sleeper-stats"
import type { SleeperStatsRow } from "./sleeper-types"

interface WeekCounts {
  played: number
  inactive: number
  skipped: number
}

const READ_PAGE = 1000

/**
 * Team defenses are players keyed by the franchise's current abbreviation.
 * Before a relocation Sleeper keys them by the old one (STL until 2015, SD
 * until 2016, OAK until 2019), and for OAK in 2017-2019 it returns both ids
 * with the same stats. Old-id rows are stored under the current id, only for
 * weeks that have no current-id row; `team` keeps the old abbreviation.
 */
const RELOCATED_DEFENSES: Record<string, string> = {
  OAK: "LV",
  SD: "LAC",
  STL: "LAR",
}

/** Loads every known player id, paging because the API caps at 1000 rows. */
export async function loadKnownPlayerIds(
  client: SupabaseClient<Database>,
): Promise<Set<string>> {
  const ids = new Set<string>()
  for (let from = 0; ; from += READ_PAGE) {
    const { data, error } = await client
      .from("players")
      .select("player_id")
      .order("player_id")
      .range(from, from + READ_PAGE - 1)
    if (error) {
      throw new Error(`Select from players failed at ${from}: ${error.message}`)
    }
    for (const row of data) {
      ids.add(row.player_id)
    }
    if (data.length < READ_PAGE) {
      break
    }
  }
  if (ids.size === 0) {
    throw new Error("The players table is empty. Run the `metadata` job first.")
  }
  return ids
}

/**
 * Fantasy points for a played row. Sleeper omits a pts_* key when it is 0
 * (it never sends an explicit 0; a 0-yard catch has pts_ppr but no pts_std),
 * so a missing key on a played row means 0, not unknown.
 */
function points(stats: Record<string, number>, key: string): number {
  return typeof stats[key] === "number" ? stats[key] : 0
}

/**
 * gp = 1 means he played. A row without gp is a stub: his team played and he
 * did not. Stub stats are only team snap counts, so they are not stored.
 */
function toRow(
  season: number,
  seasonType: SeasonType,
  playerId: string,
  row: SleeperStatsRow,
): WeekRow {
  const played = row.stats.gp === 1
  return {
    player_id: playerId,
    season,
    season_type: seasonType,
    week: row.week,
    participation: played ? "played" : "inactive",
    team: row.team,
    team_inferred: false,
    opponent: row.opponent,
    game_id: row.game_id,
    game_date: row.date,
    pts_std: played ? points(row.stats, "pts_std") : null,
    pts_half_ppr: played ? points(row.stats, "pts_half_ppr") : null,
    pts_ppr: played ? points(row.stats, "pts_ppr") : null,
    stats: played ? row.stats : null,
  }
}

function rowKey(row: WeekRow): string {
  return `${row.player_id}|${row.season_type}|${row.week}`
}

/** API rows always carry a game id; only fill rows leave it null. */
function gameIdOf(row: WeekRow): string {
  return row.game_id ?? ""
}

/**
 * Merges the API rows into one row per player-week. Primary rows (current
 * player id, kept game id) win. Fallback rows, a copy on a dropped twin game
 * or an old defense id, are remapped to the kept game id and only fill
 * player-weeks no other row covers, so they never overwrite one.
 */
function mergeFallbackRows(
  apiRows: WeekRow[],
  relocatedRows: WeekRow[],
  replacedBy: ReadonlyMap<string, string>,
): { rows: WeekRow[]; relocatedStored: number } {
  const remap = (row: WeekRow): WeekRow => {
    const keptId = replacedBy.get(gameIdOf(row))
    return keptId ? { ...row, game_id: keptId } : row
  }
  const onDroppedTwin = (row: WeekRow): boolean => replacedBy.has(gameIdOf(row))

  const rows = apiRows.filter((row) => !onDroppedTwin(row))
  const covered = new Set(rows.map(rowKey))
  const addMissing = (fallback: WeekRow[]): number => {
    let added = 0
    for (const row of fallback.map(remap)) {
      if (!covered.has(rowKey(row))) {
        covered.add(rowKey(row))
        rows.push(row)
        added++
      }
    }
    return added
  }
  addMissing(apiRows.filter(onDroppedTwin))
  return { rows, relocatedStored: addMissing(relocatedRows) }
}

/**
 * Loads one season: the schedule, every week's stat rows, then the games
 * (twins resolved by which ids the stat rows reference), the stat rows, the
 * bye/inactive fill for the regular season, and finally a prune of games an
 * older run stored by mistake. On a dry run everything is fetched and
 * counted, nothing is written. knownPlayerIds comes from the caller so
 * backfill loads it once.
 */
export async function syncSeasonStats(
  ctx: RunContext,
  season: number,
  knownPlayerIds: Set<string>,
): Promise<number> {
  const listedGames = await fetchSchedule(season)

  const regularGames = listedGames.filter((g) => g.season_type === "regular")
  const maxRegularWeek = Math.max(0, ...regularGames.map((g) => g.week))

  // Postseason weeks come from the schedule (canceled games are already
  // dropped), so a season without playoffs yet fetches none.
  const postWeeks = [
    ...new Set(
      listedGames.filter((g) => g.season_type === "post").map((g) => g.week),
    ),
  ].sort((a, b) => a - b)

  const plan: [SeasonType, number][] = [
    ...Array.from({ length: maxRegularWeek }, (_, i): [SeasonType, number] => [
      "regular",
      i + 1,
    ]),
    ...postWeeks.map((week): [SeasonType, number] => ["post", week]),
  ]

  const apiRows: WeekRow[] = []
  const relocatedRows: WeekRow[] = []
  const unknownIds = new Set<string>()
  for (const [seasonType, week] of plan) {
    const counts: WeekCounts = { played: 0, inactive: 0, skipped: 0 }
    for (const apiRow of await fetchStatsWeek(season, seasonType, week)) {
      // TEAM_ rows are aggregates. Player ids are strings, so never test
      // them for truthiness.
      if (apiRow.player_id.startsWith("TEAM_")) {
        counts.skipped++
        continue
      }
      const relocatedTo = RELOCATED_DEFENSES[apiRow.player_id]
      const playerId = relocatedTo ?? apiRow.player_id
      if (!knownPlayerIds.has(playerId)) {
        unknownIds.add(playerId)
        counts.skipped++
        continue
      }
      const row = toRow(season, seasonType, playerId, apiRow)
      // Old-id defense rows may duplicate a current-id row, so they are
      // reported by the merge below rather than counted here.
      if (relocatedTo) {
        relocatedRows.push(row)
        continue
      }
      if (row.participation === "played") {
        counts.played++
      } else {
        counts.inactive++
      }
      apiRows.push(row)
    }
    if (counts.played + counts.inactive + counts.skipped > 0) {
      console.log(
        `  ${season} ${seasonType} week ${week}: ${counts.played} played, ${counts.inactive} inactive (stub), ${counts.skipped} skipped`,
      )
    }
  }

  if (unknownIds.size > 0) {
    const examples = [...unknownIds].slice(0, 5).join(", ")
    console.warn(
      `  WARNING: skipped ${unknownIds.size} player ids missing from players (e.g. ${examples}). A large count means players is stale: run \`metadata\`.`,
    )
  }

  const rowsPerGame = new Map<string, number>()
  for (const row of [...apiRows, ...relocatedRows]) {
    rowsPerGame.set(gameIdOf(row), (rowsPerGame.get(gameIdOf(row)) ?? 0) + 1)
  }
  const { kept: games, replacedBy } = resolveDuplicateGames(
    listedGames,
    rowsPerGame,
  )
  logReplaced(replacedBy)

  const merged = mergeFallbackRows(apiRows, relocatedRows, replacedBy)
  if (relocatedRows.length > 0) {
    const duplicates = relocatedRows.length - merged.relocatedStored
    console.log(
      `  Relocated defenses: ${merged.relocatedStored} old-id rows stored under the current id; ${duplicates} skipped as copies of rows already stored.`,
    )
  }

  const gameIds = new Set(games.map((game) => game.game_id))
  const unknownGames = new Set<string>()
  const rows = merged.rows.filter((row) => {
    const gameId = gameIdOf(row)
    if (!gameIds.has(gameId)) {
      unknownGames.add(gameId)
      return false
    }
    return true
  })
  // Twins are merged above, so an unknown id here means a stat row points at
  // a game the schedule does not list at all.
  if (unknownGames.size > 0) {
    const examples = [...unknownGames].slice(0, 5).join(", ")
    console.warn(
      `  WARNING: skipped rows for ${unknownGames.size} game ids missing from the ${season} schedule (e.g. ${examples}).`,
    )
  }

  const regularRows = rows.filter((row) => row.season_type === "regular")
  const fill = fillMissingWeeks(season, games, regularRows)
  console.log(
    `  Fill ${season}: ${fill.inactive} inactive (inferred), ${fill.bye} bye.`,
  )
  rows.push(...fill.rows)

  if (ctx.dryRun) {
    // Only reads under a dry run, to preview what a real run would delete.
    await pruneGames(ctx, season, SEASON_TYPES, games)
    console.log(`Dry run: ${rows.length} rows prepared, nothing written.`)
    return 0
  }
  // Stat rows reference games, so games go first and the prune goes last.
  await saveGames(ctx, games)
  const written = await upsertRows(ctx.client, "player_week_stats", rows, [
    "player_id",
    "season",
    "season_type",
    "week",
  ])
  await pruneGames(ctx, season, SEASON_TYPES, games)
  return written
}
