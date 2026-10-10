import type { SupabaseClient } from "@supabase/supabase-js"

import { upsertRows } from "@/data/shared/db"
import type { RunContext } from "@/data/shared/runs"
import { fetchJson, SLEEPER_STATS_API } from "@/data/shared/sleeper"
import type { Database } from "@/lib/supabase/database.types"

import { fillMissingWeeks, type WeekRow } from "./fill-weeks"
import { fetchSchedule, saveGames, type SeasonType } from "./schedule"
import type { SleeperStatsRow } from "./sleeper-types"

interface WeekCounts {
  played: number
  inactive: number
  skipped: number
}

const READ_PAGE = 1000

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

// WARNING: /stats/nfl is an unofficial, undocumented Sleeper endpoint and may
// change or break without notice.
// Sleeper answers `{}` (an object) instead of `[]` for weeks without data.
async function fetchWeek(
  season: number,
  seasonType: SeasonType,
  week: number,
): Promise<SleeperStatsRow[]> {
  const body = await fetchJson<SleeperStatsRow[] | Record<string, never>>(
    `${SLEEPER_STATS_API}/stats/nfl/${season}/${week}?season_type=${seasonType}`,
  )
  return Array.isArray(body) ? body : []
}

function statNumber(stats: Record<string, number>, key: string): number | null {
  return typeof stats[key] === "number" ? stats[key] : null
}

/**
 * gp = 1 means he played. A row without gp is a stub: his team played and he
 * did not. Stub stats are only team snap counts, so they are not stored.
 */
function toRow(
  season: number,
  seasonType: SeasonType,
  row: SleeperStatsRow,
): WeekRow {
  const played = row.stats.gp === 1
  return {
    player_id: row.player_id,
    season,
    season_type: seasonType,
    week: row.week,
    participation: played ? "played" : "inactive",
    team: row.team,
    team_inferred: false,
    opponent: row.opponent,
    game_id: row.game_id,
    game_date: row.date,
    pts_std: played ? statNumber(row.stats, "pts_std") : null,
    pts_half_ppr: played ? statNumber(row.stats, "pts_half_ppr") : null,
    pts_ppr: played ? statNumber(row.stats, "pts_ppr") : null,
    stats: played ? row.stats : null,
  }
}

/**
 * Loads one season: schedule first (stat rows reference its game ids), then
 * every week's stat rows, then the bye/inactive fill for the regular season.
 * On a dry run everything is fetched and counted, nothing is written.
 * knownPlayerIds comes from the caller so backfill loads it once.
 */
export async function syncSeasonStats(
  ctx: RunContext,
  season: number,
  knownPlayerIds: Set<string>,
): Promise<number> {
  const games = await fetchSchedule(season)
  await saveGames(ctx, games)

  const gameIds = new Set(games.map((game) => game.game_id))
  const regularGames = games.filter((game) => game.season_type === "regular")
  const maxRegularWeek = Math.max(0, ...regularGames.map((g) => g.week))

  // Postseason weeks come from the schedule (canceled games are already
  // dropped), so a season without playoffs yet fetches none.
  const postWeeks = [
    ...new Set(
      games.filter((g) => g.season_type === "post").map((g) => g.week),
    ),
  ].sort((a, b) => a - b)

  const plan: [SeasonType, number][] = [
    ...Array.from({ length: maxRegularWeek }, (_, i): [SeasonType, number] => [
      "regular",
      i + 1,
    ]),
    ...postWeeks.map((week): [SeasonType, number] => ["post", week]),
  ]

  const rows: WeekRow[] = []
  const unknownIds = new Set<string>()
  const unknownGames = new Set<string>()
  for (const [seasonType, week] of plan) {
    const counts: WeekCounts = { played: 0, inactive: 0, skipped: 0 }
    for (const apiRow of await fetchWeek(season, seasonType, week)) {
      // TEAM_ rows are aggregates. Player ids are strings and "0" is a real
      // id, so never test them for truthiness.
      if (apiRow.player_id.startsWith("TEAM_")) {
        counts.skipped++
        continue
      }
      if (!knownPlayerIds.has(apiRow.player_id)) {
        unknownIds.add(apiRow.player_id)
        counts.skipped++
        continue
      }
      if (!gameIds.has(apiRow.game_id)) {
        unknownGames.add(apiRow.game_id)
        counts.skipped++
        continue
      }
      const row = toRow(season, seasonType, apiRow)
      if (row.participation === "played") {
        counts.played++
      } else {
        counts.inactive++
      }
      rows.push(row)
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
  // The schedule dedupe rule was checked against every 2009/2010 duplicate,
  // so an unknown id here means Sleeper's schedule changed shape.
  if (unknownGames.size > 0) {
    const examples = [...unknownGames].slice(0, 5).join(", ")
    console.warn(
      `  WARNING: skipped rows for ${unknownGames.size} game ids missing from the ${season} schedule (e.g. ${examples}). schedule.ts probably dropped a real game.`,
    )
  }

  const regularRows = rows.filter((row) => row.season_type === "regular")
  const fill = fillMissingWeeks(season, games, regularRows)
  console.log(
    `  Fill ${season}: ${fill.inactive} inactive (inferred), ${fill.bye} bye.`,
  )
  rows.push(...fill.rows)

  if (ctx.dryRun) {
    console.log(`Dry run: ${rows.length} rows prepared, nothing written.`)
    return 0
  }
  return upsertRows(ctx.client, "player_week_stats", rows, [
    "player_id",
    "season",
    "season_type",
    "week",
  ])
}
