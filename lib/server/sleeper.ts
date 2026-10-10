import "server-only"

import { placeholderStandings } from "@/lib/league"
import type {
  HomeData,
  SleeperRoster,
  SleeperUser,
  StandingRow,
} from "@/lib/types"

const BASE_URL = "https://api.sleeper.app/v1"

async function sleeperFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { next: { revalidate: 300 } })
  if (!res.ok) {
    throw new Error(`Sleeper ${path} responded ${res.status}`)
  }
  return (await res.json()) as T
}

export function rankRosters(
  rosters: SleeperRoster[],
  users: SleeperUser[],
): StandingRow[] {
  const usersById = new Map(users.map((u) => [u.user_id, u]))

  const rows = rosters.map((roster) => {
    const user = roster.owner_id ? usersById.get(roster.owner_id) : undefined
    const manager = user?.display_name ?? `Team ${roster.roster_id}`
    const { wins, losses, ties, fpts, fpts_decimal } = roster.settings
    return {
      rosterId: roster.roster_id,
      teamName: user?.metadata?.team_name ?? manager,
      manager,
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

export async function getHomeData(): Promise<HomeData> {
  const leagueId = process.env.LEAGUE_ID
  if (!leagueId) {
    return {
      source: "placeholder",
      standings: placeholderStandings,
      totalTeams: placeholderStandings.length,
    }
  }

  try {
    const [rosters, users] = await Promise.all([
      sleeperFetch<SleeperRoster[]>(`/league/${leagueId}/rosters`),
      sleeperFetch<SleeperUser[]>(`/league/${leagueId}/users`),
    ])
    if (!Array.isArray(rosters) || !Array.isArray(users)) {
      throw new Error("Sleeper rosters or users response was not an array")
    }
    const standings = rankRosters(rosters, users)
    return { source: "sleeper", standings, totalTeams: standings.length }
  } catch (error) {
    console.error(`Sleeper standings failed for league ${leagueId}`, error)
    return { source: "sleeper-unavailable", standings: null, totalTeams: 0 }
  }
}
