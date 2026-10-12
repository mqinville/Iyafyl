import { getLeagueStandings } from "@/lib/server/sleeper"
import type { LeagueStandings } from "@/lib/types"

const headers = { "Cache-Control": "private, no-store" }

export async function GET() {
  const standings = await getLeagueStandings()
  const status = standings.source === "sleeper-unavailable" ? 503 : 200
  return Response.json(standings satisfies LeagueStandings, {
    status,
    headers,
  })
}
