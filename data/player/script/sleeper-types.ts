/** Subset of Sleeper's /players/nfl entry that the ingestion reads. */
export interface SleeperPlayer {
  player_id: string
  // Team defenses ship without full_name.
  full_name?: string
  first_name?: string | null
  last_name?: string | null
  position?: string | null
  fantasy_positions?: string[] | null
  team?: string | null
  status?: string | null
  // May be "" or "NA" as well as null.
  injury_status?: string | null
  active?: boolean
  birth_date?: string | null
  college?: string | null
  years_exp?: number | null
  number?: number | null
  // "71" (inches) or `6'2"`.
  height?: string | null
  weight?: string | null
  gsis_id?: string | null
  espn_id?: number | string | null
  yahoo_id?: number | string | null
  sportradar_id?: string | null
}

export interface SleeperScheduleEntry {
  game_id: string
  week: number
  date: string
  home: string
  away: string
  status: string
}

export interface SleeperStatsRow {
  player_id: string
  team: string
  opponent: string
  game_id: string
  date: string
  week: number
  season: string
  season_type: string
  stats: Record<string, number>
}

export interface SleeperState {
  season: string
  season_type: string
  week: number
}
