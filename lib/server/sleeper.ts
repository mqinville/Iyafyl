import "server-only"

import { placeholderStandings } from "@/lib/league"
import type {
  HomeData,
  LeagueRecap,
  LeagueStandings,
  LeagueStatus,
  LeagueSummary,
  NflSeasonType,
  RecapEmptyReason,
  RecapMatchup,
  RecapSide,
  SleeperRoster,
  SleeperUser,
  StandingRow,
} from "@/lib/types"

const BASE_URL = "https://api.sleeper.app/v1"

interface ParsedLeague {
  name: string
  season: string
  status: LeagueStatus
  totalTeams: number
  lastScoredLeg: number | undefined
}

interface ParsedState {
  week: number
  seasonType: NflSeasonType
}

interface ParsedMatchup {
  rosterId: number
  matchupId: number | null
  points: number
}

type RecapWeekDecision =
  | { kind: "empty"; reason: RecapEmptyReason }
  | { kind: "week"; week: number }
  | { kind: "state-week-if-scored"; week: number }

function readLeagueId(): string | null {
  const leagueId = process.env.LEAGUE_ID
  if (!leagueId) {
    return null
  }
  return leagueId
}

async function sleeperFetch(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, { next: { revalidate: 300 } })
  if (!res.ok) {
    throw new Error(`Sleeper ${path} responded ${res.status}`)
  }
  return (await res.json()) as unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  return undefined
}

function isLeagueStatus(value: unknown): value is LeagueStatus {
  switch (value) {
    case "pre_draft":
    case "drafting":
    case "in_season":
    case "complete":
      return true
    default:
      return false
  }
}

function isSeasonType(value: unknown): value is NflSeasonType {
  switch (value) {
    case "pre":
    case "regular":
    case "post":
      return true
    default:
      return false
  }
}

function parseLeague(value: unknown): ParsedLeague {
  if (!isRecord(value)) {
    throw new Error("Sleeper league response was not an object")
  }
  const name = value.name
  const season = value.season
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("Sleeper league name was missing")
  }
  if (typeof season !== "string" || season.length === 0) {
    throw new Error("Sleeper league season was missing")
  }
  if (!isLeagueStatus(value.status)) {
    throw new Error("Sleeper league status was missing")
  }
  const totalTeams = finiteNumber(value.total_rosters)
  if (totalTeams === undefined || !Number.isInteger(totalTeams)) {
    throw new Error("Sleeper league total_rosters was missing")
  }
  const settings = value.settings
  const lastScoredLeg = isRecord(settings)
    ? finiteNumber(settings.last_scored_leg)
    : undefined
  return {
    name,
    season,
    status: value.status,
    totalTeams,
    lastScoredLeg,
  }
}

function parseNflState(value: unknown): ParsedState {
  if (!isRecord(value)) {
    throw new Error("Sleeper NFL state response was not an object")
  }
  const week = finiteNumber(value.week)
  if (week === undefined || !Number.isInteger(week) || week < 1) {
    throw new Error("Sleeper NFL state week was missing")
  }
  if (!isSeasonType(value.season_type)) {
    throw new Error("Sleeper NFL state season_type was missing")
  }
  return { week, seasonType: value.season_type }
}

function parseRosters(value: unknown): SleeperRoster[] {
  if (!Array.isArray(value)) {
    throw new Error("Sleeper rosters response was not an array")
  }
  return value.map((row) => {
    if (!isRecord(row) || !isRecord(row.settings)) {
      throw new Error("Sleeper roster was not an object")
    }
    const rosterId = finiteNumber(row.roster_id)
    if (rosterId === undefined) {
      throw new Error("Sleeper roster was missing roster_id")
    }
    const settings = row.settings
    return {
      roster_id: rosterId,
      owner_id: typeof row.owner_id === "string" ? row.owner_id : null,
      settings: {
        wins: finiteNumber(settings.wins),
        losses: finiteNumber(settings.losses),
        ties: finiteNumber(settings.ties),
        fpts: finiteNumber(settings.fpts),
        fpts_decimal: finiteNumber(settings.fpts_decimal),
      },
    }
  })
}

function teamNameFrom(metadata: unknown): string | undefined {
  if (!isRecord(metadata)) {
    return undefined
  }
  const teamName = metadata.team_name
  if (typeof teamName !== "string") {
    return undefined
  }
  return teamName
}

function parseUsers(value: unknown): SleeperUser[] {
  if (!Array.isArray(value)) {
    throw new Error("Sleeper users response was not an array")
  }
  return value.map((row) => {
    if (!isRecord(row) || typeof row.user_id !== "string") {
      throw new Error("Sleeper user was missing user_id")
    }
    if (typeof row.display_name !== "string") {
      throw new Error("Sleeper user was missing display_name")
    }
    const teamName = teamNameFrom(row.metadata)
    return {
      user_id: row.user_id,
      display_name: row.display_name,
      metadata: teamName === undefined ? null : { team_name: teamName },
    }
  })
}

function parseMatchups(value: unknown): ParsedMatchup[] {
  if (!Array.isArray(value)) {
    throw new Error("Sleeper matchups response was not an array")
  }
  return value.map((row) => {
    if (!isRecord(row)) {
      throw new Error("Sleeper matchup was not an object")
    }
    const rosterId = finiteNumber(row.roster_id)
    const points = finiteNumber(row.points)
    if (rosterId === undefined || points === undefined) {
      throw new Error("Sleeper matchup was missing roster_id or points")
    }
    const matchupId = row.matchup_id
    if (matchupId !== null && typeof matchupId !== "number") {
      throw new Error("Sleeper matchup_id was not a number or null")
    }
    return { rosterId, matchupId, points }
  })
}

function rosterName(
  rosterId: number,
  ownerId: string | null,
  usersById: Map<string, SleeperUser>,
): { teamName: string; manager: string } {
  const user = ownerId ? usersById.get(ownerId) : undefined
  const manager = user?.display_name ?? `Team ${rosterId}`
  return {
    teamName: user?.metadata?.team_name ?? manager,
    manager,
  }
}

export function rankRosters(
  rosters: SleeperRoster[],
  users: SleeperUser[],
): StandingRow[] {
  const usersById = new Map(users.map((user) => [user.user_id, user]))

  const rows = rosters.map((roster) => {
    const names = rosterName(roster.roster_id, roster.owner_id, usersById)
    const { wins, losses, ties, fpts, fpts_decimal } = roster.settings
    return {
      rosterId: roster.roster_id,
      teamName: names.teamName,
      manager: names.manager,
      wins: wins ?? 0,
      losses: losses ?? 0,
      ties: ties ?? 0,
      pointsFor: (fpts ?? 0) + (fpts_decimal ?? 0) / 100,
    }
  })

  rows.sort(
    (a, b) =>
      b.wins - a.wins ||
      b.pointsFor - a.pointsFor ||
      a.teamName.localeCompare(b.teamName),
  )
  return rows.map((row, i) => ({ ...row, rank: i + 1 }))
}

function decideInSeasonWeek(
  seasonType: NflSeasonType,
  stateWeek: number,
): RecapWeekDecision {
  switch (seasonType) {
    case "pre":
      // Fantasy scoring has not started before the regular season.
      return { kind: "empty", reason: "no_prior_week" }
    case "regular":
    case "post":
      if (stateWeek > 1) {
        return { kind: "week", week: stateWeek - 1 }
      }
      return { kind: "empty", reason: "no_prior_week" }
    default: {
      const unreachable: never = seasonType
      return unreachable
    }
  }
}

async function decideRecapWeek(
  league: ParsedLeague,
): Promise<RecapWeekDecision> {
  switch (league.status) {
    case "pre_draft":
    case "drafting":
      return { kind: "empty", reason: "not_started" }
    case "complete":
      if (
        league.lastScoredLeg !== undefined &&
        Number.isInteger(league.lastScoredLeg) &&
        league.lastScoredLeg >= 1
      ) {
        return { kind: "week", week: league.lastScoredLeg }
      }
      // settings.last_scored_leg is the last week Sleeper scored. When a
      // completed league omits it, use the NFL state week only if that
      // week's matchups include points.
      return {
        kind: "state-week-if-scored",
        week: (await fetchNflState()).week,
      }
    case "in_season": {
      const state = await fetchNflState()
      return decideInSeasonWeek(state.seasonType, state.week)
    }
    default: {
      const unreachable: never = league.status
      return unreachable
    }
  }
}

function hasScoredMatchups(rows: ParsedMatchup[]): boolean {
  return rows.some((row) => row.matchupId !== null)
}

function pairMatchups(
  rows: ParsedMatchup[],
  rosters: SleeperRoster[],
  users: SleeperUser[],
): RecapMatchup[] {
  const usersById = new Map(users.map((user) => [user.user_id, user]))
  const rostersById = new Map(
    rosters.map((roster) => [roster.roster_id, roster]),
  )
  const groups = new Map<number, ParsedMatchup[]>()

  for (const row of rows) {
    if (row.matchupId === null) {
      continue
    }
    const group = groups.get(row.matchupId)
    if (group) {
      group.push(row)
    } else {
      groups.set(row.matchupId, [row])
    }
  }

  const matchups: RecapMatchup[] = []
  for (const [matchupId, group] of groups) {
    const left = group[0]
    const right = group[1]
    if (group.length !== 2 || !left || !right) {
      continue
    }
    const ordered =
      left.rosterId <= right.rosterId ? [left, right] : [right, left]
    const a = toSide(ordered[0], rostersById, usersById)
    const b = toSide(ordered[1], rostersById, usersById)
    matchups.push({
      matchupId,
      a,
      b,
      winnerRosterId: winnerOf(a, b),
    })
  }

  matchups.sort((left, right) => {
    const leftHigh = Math.max(left.a.points, left.b.points)
    const rightHigh = Math.max(right.a.points, right.b.points)
    return rightHigh - leftHigh || left.matchupId - right.matchupId
  })
  return matchups
}

function toSide(
  row: ParsedMatchup,
  rostersById: Map<number, SleeperRoster>,
  usersById: Map<string, SleeperUser>,
): RecapSide {
  const roster = rostersById.get(row.rosterId)
  const names = rosterName(row.rosterId, roster?.owner_id ?? null, usersById)
  return {
    rosterId: row.rosterId,
    teamName: names.teamName,
    manager: names.manager,
    points: row.points,
  }
}

function winnerOf(a: RecapSide, b: RecapSide): number | null {
  if (a.points === b.points) {
    return null
  }
  return a.points > b.points ? a.rosterId : b.rosterId
}

function emptyRecap(reason: RecapEmptyReason, season: string): LeagueRecap {
  return {
    source: "sleeper",
    outcome: "empty",
    reason,
    week: null,
    season,
    matchups: [],
  }
}

async function fetchLeague(leagueId: string): Promise<ParsedLeague> {
  const path = `/league/${encodeURIComponent(leagueId)}`
  return parseLeague(await sleeperFetch(path))
}

async function fetchNflState(): Promise<ParsedState> {
  return parseNflState(await sleeperFetch("/state/nfl"))
}

export async function getLeagueSummary(): Promise<LeagueSummary> {
  const leagueId = readLeagueId()
  if (!leagueId) {
    return { source: "placeholder" }
  }

  try {
    const [league, state] = await Promise.all([
      fetchLeague(leagueId),
      fetchNflState(),
    ])
    return {
      source: "sleeper",
      name: league.name,
      season: league.season,
      status: league.status,
      totalTeams: league.totalTeams,
      week: state.week,
      seasonType: state.seasonType,
    }
  } catch (error) {
    console.error(`Sleeper league summary failed for league ${leagueId}`, error)
    return { source: "sleeper-unavailable" }
  }
}

export async function getLeagueStandings(): Promise<LeagueStandings> {
  const leagueId = readLeagueId()
  if (!leagueId) {
    return { source: "placeholder" }
  }

  try {
    const [rosters, users] = await Promise.all([
      sleeperFetch(`/league/${encodeURIComponent(leagueId)}/rosters`),
      sleeperFetch(`/league/${encodeURIComponent(leagueId)}/users`),
    ])
    const standings = rankRosters(parseRosters(rosters), parseUsers(users))
    return { source: "sleeper", standings, totalTeams: standings.length }
  } catch (error) {
    console.error(`Sleeper standings failed for league ${leagueId}`, error)
    return { source: "sleeper-unavailable" }
  }
}

export async function getLeagueRecap(): Promise<LeagueRecap> {
  const leagueId = readLeagueId()
  if (!leagueId) {
    return { source: "placeholder" }
  }

  try {
    const league = await fetchLeague(leagueId)
    const decision = await decideRecapWeek(league)
    if (decision.kind === "empty") {
      return emptyRecap(decision.reason, league.season)
    }

    const week = decision.week
    const encodedId = encodeURIComponent(leagueId)
    const [matchupRaw, rosterRaw, userRaw] = await Promise.all([
      sleeperFetch(`/league/${encodedId}/matchups/${week}`),
      sleeperFetch(`/league/${encodedId}/rosters`),
      sleeperFetch(`/league/${encodedId}/users`),
    ])
    const rows = parseMatchups(matchupRaw)
    if (decision.kind === "state-week-if-scored" && !hasScoredMatchups(rows)) {
      throw new Error(
        "Completed league is missing last_scored_leg and the state week has no matchup points",
      )
    }
    const matchups = pairMatchups(
      rows,
      parseRosters(rosterRaw),
      parseUsers(userRaw),
    )
    if (matchups.length === 0) {
      throw new Error("Sleeper recap week had no paired matchups")
    }
    return {
      source: "sleeper",
      outcome: "matchups",
      week,
      season: league.season,
      matchups,
    }
  } catch (error) {
    console.error(`Sleeper recap failed for league ${leagueId}`, error)
    return { source: "sleeper-unavailable" }
  }
}

export async function getHomeData(): Promise<HomeData> {
  const standings = await getLeagueStandings()
  switch (standings.source) {
    case "placeholder":
      return {
        source: "placeholder",
        standings: placeholderStandings,
        totalTeams: placeholderStandings.length,
      }
    case "sleeper":
      return standings
    case "sleeper-unavailable":
      return { source: "sleeper-unavailable", standings: null, totalTeams: 0 }
    default: {
      const unreachable: never = standings
      return unreachable
    }
  }
}
