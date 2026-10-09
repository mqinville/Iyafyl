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

export type HomeData =
  | { source: "placeholder"; standings: StandingRow[]; totalTeams: number }
  | { source: "sleeper"; standings: StandingRow[]; totalTeams: number }
  | { source: "sleeper-unavailable"; standings: null; totalTeams: 0 }
