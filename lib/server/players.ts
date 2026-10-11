import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { PLAYER_SEARCH_MIN_LENGTH } from "@/lib/player-search"
import { playerImageUrl } from "@/lib/sleeper-cdn"
import type { Database } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"
import type {
  Participation,
  PlayerCard,
  PlayerCardSchedule,
  PlayerGameLog,
  PlayerScheduleGame,
  PlayerSearchResult,
  SeasonType,
} from "@/lib/types"

const MAX_QUERY_LENGTH = 50
const RESULT_LIMIT = 8

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

export type PlayerCardOutcome =
  | { status: "ok"; card: PlayerCard }
  | { status: "not_found" }
  | { status: "unauthorized" }
  | { status: "unavailable" }

const PLAYER_COLUMNS =
  "player_id, full_name, position, team, active, injury_status, jersey_number, height_in, weight_lb, birth_date, college, years_exp"
const LOG_COLUMNS =
  "season, season_type, week, participation, team, opponent, game_date, pts_std, pts_half_ppr, pts_ppr, stats, nfl_games(home, away)"

// numeric columns can arrive as number or string; null stays null.
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function toStats(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  const stats: Record<string, number> = {}
  for (const [key, v] of Object.entries(value)) {
    const n = toNumber(v)
    if (n !== null) {
      stats[key] = n
    }
  }
  return stats
}

function seasonTypeOrder(type: SeasonType): number {
  return type === "regular" ? 0 : 1
}

type SupabaseServerClient = SupabaseClient<Database>
type PlayerWeekRow = Database["public"]["Tables"]["player_week_stats"]["Row"]
interface NflGameTeams {
  home: string
  away: string
}
type GameRow = Pick<
  Database["public"]["Tables"]["nfl_games"]["Row"],
  "season_type" | "week" | "game_date" | "home" | "away"
>
type LogRow = Pick<
  PlayerWeekRow,
  | "season"
  | "season_type"
  | "week"
  | "participation"
  | "team"
  | "opponent"
  | "game_date"
  | "pts_std"
  | "pts_half_ppr"
  | "pts_ppr"
  | "stats"
> & {
  nfl_games: NflGameTeams | NflGameTeams[] | null
}

function toGameLog(row: LogRow): PlayerGameLog {
  // A to-one embed arrives as an object; tolerate an array form.
  const game = Array.isArray(row.nfl_games) ? row.nfl_games[0] : row.nfl_games
  return {
    season: row.season,
    seasonType: row.season_type as SeasonType,
    week: row.week,
    participation: row.participation as Participation,
    team: row.team,
    opponent: row.opponent ?? null,
    isAway: game ? row.team === game.away : null,
    gameDate: row.game_date ?? null,
    ptsStd: toNumber(row.pts_std),
    ptsHalfPpr: toNumber(row.pts_half_ppr),
    ptsPpr: toNumber(row.pts_ppr),
    stats: toStats(row.stats),
  }
}

function toScheduleGame(game: GameRow, team: string): PlayerScheduleGame {
  const isAway = game.away === team
  return {
    seasonType: game.season_type as SeasonType,
    week: game.week,
    opponent: isAway ? game.home : game.away,
    isAway,
    gameDate: game.game_date ?? null,
  }
}

// Team abbreviations are interpolated into the `.or()` filter string below,
// so anything but a short alphanumeric code is rejected.
const TEAM_PATTERN = /^[A-Za-z0-9]{1,5}$/

// A schedule failure degrades to null: the log and bio are still worth showing.
async function fetchSchedule(
  supabase: SupabaseServerClient,
  season: number,
  team: string,
): Promise<PlayerCardSchedule | null> {
  if (!TEAM_PATTERN.test(team)) {
    return null
  }
  const { data, error } = await supabase
    .from("nfl_games")
    .select("season_type, week, game_date, home, away")
    .eq("season", season)
    .or(`home.eq.${team},away.eq.${team}`)
  if (error) {
    console.error("Player schedule failed", error)
    return null
  }
  const games = data.map((game) => toScheduleGame(game, team))
  games.sort(
    (a, b) =>
      seasonTypeOrder(a.seasonType) - seasonTypeOrder(b.seasonType) ||
      a.week - b.week,
  )
  return { season, team, games }
}

export async function getPlayerCard(
  playerId: string,
): Promise<PlayerCardOutcome> {
  const supabase = await createClient()
  if (!supabase) {
    return { status: "unavailable" }
  }

  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) {
    return { status: "unauthorized" }
  }

  const [playerRes, logsRes] = await Promise.all([
    supabase
      .from("players")
      .select(PLAYER_COLUMNS)
      .eq("player_id", playerId)
      .maybeSingle(),
    supabase
      .from("player_week_stats")
      .select(LOG_COLUMNS)
      .eq("player_id", playerId)
      .order("season", { ascending: false })
      .order("week", { ascending: true }),
  ])
  if (playerRes.error || logsRes.error) {
    console.error("Player card failed", playerRes.error ?? logsRes.error)
    return { status: "unavailable" }
  }
  const player = playerRes.data
  if (!player) {
    return { status: "not_found" }
  }

  const logs = logsRes.data.map(toGameLog)
  logs.sort(
    (a, b) =>
      b.season - a.season ||
      seasonTypeOrder(a.seasonType) - seasonTypeOrder(b.seasonType) ||
      a.week - b.week,
  )

  const seasons = [...new Set(logs.map((log) => log.season))]
  const position = player.position ?? null
  const team = player.team ?? null
  const injury = player.injury_status?.trim() ?? ""

  const latest = seasons[0]
  const schedule =
    team && latest !== undefined
      ? await fetchSchedule(supabase, latest, team)
      : null

  return {
    status: "ok",
    card: {
      bio: {
        id: player.player_id,
        name: player.full_name,
        position,
        team,
        active: player.active,
        injuryStatus: injury === "" || injury === "NA" ? null : injury,
        jerseyNumber: player.jersey_number ?? null,
        heightIn: toNumber(player.height_in),
        weightLb: toNumber(player.weight_lb),
        birthDate: player.birth_date ?? null,
        college: player.college ?? null,
        yearsExp: player.years_exp ?? null,
        imageUrl: playerImageUrl(player.player_id, position),
      },
      seasons,
      logs,
      schedule,
    },
  }
}
