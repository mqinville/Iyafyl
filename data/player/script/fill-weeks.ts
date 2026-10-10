import type { TablesInsert } from "@/lib/supabase/database.types"

import type { GameRow } from "./schedule"

export type WeekRow = TablesInsert<"player_week_stats">

export interface FillResult {
  rows: WeekRow[]
  inactive: number
  bye: number
}

// Postponed and canceled games do not count as "the team played that week".
function isLive(game: GameRow): boolean {
  return game.status !== "postponed" && game.status !== "canceled"
}

/**
 * Regular-season games indexed by week, then by team (home or away).
 *
 * A game postponed out of its week leaves that team with no live game there,
 * so it gets a 'bye'. That matches 2020, when TEN/PIT effectively had their
 * bye in week 4 and NE/DEN theirs in week 5.
 */
function indexGames(games: GameRow[]): Map<number, Map<string, GameRow>> {
  const byWeek = new Map<number, Map<string, GameRow>>()
  for (const game of games) {
    if (!isLive(game)) {
      continue
    }
    const teams = byWeek.get(game.week) ?? new Map<string, GameRow>()
    for (const team of [game.home, game.away]) {
      if (teams.has(team)) {
        console.warn(
          `Team ${team} has two live games in week ${game.week} (${teams.get(team)?.game_id}, ${game.game_id}); keeping the latter.`,
        )
      }
    }
    teams.set(game.home, game)
    teams.set(game.away, game)
    byWeek.set(game.week, teams)
  }
  return byWeek
}

/**
 * Weeks safe to fill: at least one game, and every non-postponed/canceled game
 * is complete. This keeps in-progress and future weeks of the current season
 * out of the fill. Sleeper's stats can lag the final whistle, so fill rows for
 * the latest week are provisional; re-running the season overwrites them.
 */
function finalWeeks(games: GameRow[]): number[] {
  const weeks = new Set(games.map((game) => game.week))
  return [...weeks]
    .filter((week) => {
      const live = games.filter((g) => g.week === week && isLive(g))
      return live.length > 0 && live.every((g) => g.status === "complete")
    })
    .sort((a, b) => a - b)
}

/** Team from the nearest week with a row: earlier weeks first, then later. */
function nearestTeam(
  rowsByWeek: Map<number, WeekRow>,
  week: number,
  maxWeek: number,
  playerId: string,
  season: number,
): string {
  for (let w = week - 1; w >= 1; w--) {
    const team = rowsByWeek.get(w)?.team
    if (team) {
      return team
    }
  }
  for (let w = week + 1; w <= maxWeek; w++) {
    const team = rowsByWeek.get(w)?.team
    if (team) {
      return team
    }
  }
  // A player only gets here with at least one row, and every row has a team.
  throw new Error(`No team found for player ${playerId} in ${season}.`)
}

/**
 * Builds the rows Sleeper omits for regular-season weeks: a missing week is
 * 'inactive' when the player's team had a game, 'bye' when it did not.
 *
 * The team is copied from the nearest week with a row (team_inferred = true).
 * This is imprecise for a trade right next to an absent week and for weeks
 * before a mid-season signing; team_inferred lets readers discount those rows.
 *
 * existingRows are the API rows (played + stub) for the season; only the
 * missing rows are returned.
 */
export function fillMissingWeeks(
  season: number,
  allGames: GameRow[],
  existingRows: WeekRow[],
): FillResult {
  // Post weeks 1-4 would collide with regular weeks 1-4, so the filter lives
  // here rather than in callers.
  const games = allGames.filter((game) => game.season_type === "regular")
  const gamesByWeek = indexGames(games)
  const weeks = finalWeeks(games)
  const maxWeek = Math.max(0, ...games.map((game) => game.week))

  const rowsByPlayer = new Map<string, Map<number, WeekRow>>()
  for (const row of existingRows) {
    const weekRows = rowsByPlayer.get(row.player_id) ?? new Map()
    weekRows.set(row.week, row)
    rowsByPlayer.set(row.player_id, weekRows)
  }

  const result: FillResult = { rows: [], inactive: 0, bye: 0 }
  for (const [playerId, rowsByWeek] of rowsByPlayer) {
    for (const week of weeks) {
      if (rowsByWeek.has(week)) {
        continue
      }
      const team = nearestTeam(rowsByWeek, week, maxWeek, playerId, season)
      const game = gamesByWeek.get(week)?.get(team)
      const base = {
        player_id: playerId,
        season,
        season_type: "regular",
        week,
        team,
        team_inferred: true,
        stats: null,
        pts_std: null,
        pts_half_ppr: null,
        pts_ppr: null,
      }
      if (game) {
        result.rows.push({
          ...base,
          participation: "inactive",
          opponent: game.home === team ? game.away : game.home,
          game_id: game.game_id,
          game_date: game.game_date,
        })
        result.inactive++
      } else {
        result.rows.push({
          ...base,
          participation: "bye",
          opponent: null,
          game_id: null,
          game_date: null,
        })
        result.bye++
      }
    }
  }
  return result
}
