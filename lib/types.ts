export interface StandingRow {
  rosterId: number
  rank: number
  teamName: string
  manager: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
}

export interface LeagueTitles {
  guru: { manager: string; team: string; note: string }
  kingShit: { manager: string; punishment: string }
}

export interface WeeklyStory {
  week: number
  season: number
  headline: string
  deck: string
}

export interface SleeperRoster {
  roster_id: number
  owner_id: string | null
  settings: {
    wins?: number
    losses?: number
    ties?: number
    fpts?: number
    fpts_decimal?: number
  }
}

export interface SleeperUser {
  user_id: string
  display_name: string
  metadata?: { team_name?: string } | null
}

export type LeagueStatus = "pre_draft" | "drafting" | "in_season" | "complete"

export type NflSeasonType = "pre" | "regular" | "post"

export interface SleeperLeague {
  name: string
  season: string
  status: LeagueStatus
  total_rosters: number
  settings?: { last_scored_leg?: number } | null
}

export interface SleeperNflState {
  week: number
  season_type: NflSeasonType
}

export interface SleeperMatchup {
  roster_id: number
  matchup_id: number | null
  points: number
}

// One row of the header player search (GET /api/players/search).
export interface PlayerSearchResult {
  id: string
  name: string
  position: string | null
  team: string | null
  active: boolean
  // Sleeper CDN headshot (team logo for defenses); may 403 when missing.
  imageUrl: string
}

export interface PlayerSearchResponse {
  results: PlayerSearchResult[]
}

export type SeasonType = "regular" | "post"
export type Participation = "played" | "inactive" | "bye"

// GET /api/players/[playerId]: bio, full game log and latest-season schedule.
export interface PlayerCardBio {
  id: string
  name: string
  position: string | null
  team: string | null
  active: boolean
  // "" and "NA" from Sleeper are normalized to null.
  injuryStatus: string | null
  jerseyNumber: number | null
  heightIn: number | null
  weightLb: number | null
  // ISO date.
  birthDate: string | null
  college: string | null
  yearsExp: number | null
  imageUrl: string
}

export interface PlayerGameLog {
  season: number
  seasonType: SeasonType
  week: number
  participation: Participation
  team: string
  opponent: string | null
  // From nfl_games (team === away); null when there is no game.
  isAway: boolean | null
  gameDate: string | null
  ptsStd: number | null
  ptsHalfPpr: number | null
  ptsPpr: number | null
  stats: Record<string, number> | null
}

// Team schedule for the latest season; fills weeks without a log row.
export interface PlayerScheduleGame {
  seasonType: SeasonType
  week: number
  opponent: string
  isAway: boolean
  gameDate: string | null
}

export interface PlayerCardSchedule {
  season: number
  team: string
  games: PlayerScheduleGame[]
}

export interface PlayerCard {
  bio: PlayerCardBio
  // Distinct seasons with any log row, descending.
  seasons: number[]
  // Season desc, then regular before post, then week asc.
  logs: PlayerGameLog[]
  // Null when the player has no team or no known season.
  schedule: PlayerCardSchedule | null
}

export interface PlayerCardResponse {
  card: PlayerCard
}

export interface PlayerCardErrorResponse {
  error: "not_found" | "unauthorized" | "unavailable"
}

// What a player tab needs; PlayerSearchResult is structurally assignable.
export interface PlayerTab {
  id: string
  name: string
  position: string | null
  team: string | null
}

export type HomeData =
  | { source: "placeholder"; standings: StandingRow[]; totalTeams: number }
  | { source: "sleeper"; standings: StandingRow[]; totalTeams: number }
  | { source: "sleeper-unavailable"; standings: null; totalTeams: 0 }

// GET /api/league. Placeholder means LEAGUE_ID is unset (no sample rows).
export type LeagueSummary =
  | { source: "placeholder" }
  | { source: "sleeper-unavailable" }
  | {
      source: "sleeper"
      name: string
      season: string
      status: LeagueStatus
      totalTeams: number
      week: number
      seasonType: NflSeasonType
    }

// GET /api/league/standings. Placeholder means LEAGUE_ID is unset.
export type LeagueStandings =
  | { source: "placeholder" }
  | { source: "sleeper-unavailable" }
  | { source: "sleeper"; standings: StandingRow[]; totalTeams: number }

export interface RecapSide {
  rosterId: number
  teamName: string
  manager: string
  points: number
}

export interface RecapMatchup {
  matchupId: number
  a: RecapSide
  b: RecapSide
  winnerRosterId: number | null
}

export type RecapEmptyReason = "no_prior_week" | "not_started"

// GET /api/league/recap. `week` is the week being recapped, not the NFL state week.
export type LeagueRecap =
  | { source: "placeholder" }
  | { source: "sleeper-unavailable" }
  | {
      source: "sleeper"
      outcome: "empty"
      reason: RecapEmptyReason
      week: null
      season: string
      matchups: []
    }
  | {
      source: "sleeper"
      outcome: "matchups"
      week: number
      season: string
      matchups: RecapMatchup[]
    }
