import { getLeagueRecap } from "@/lib/server/sleeper"
import type { LeagueRecap } from "@/lib/types"

const headers = { "Cache-Control": "private, no-store" }

export async function GET() {
  const recap = await getLeagueRecap()
  const status = recap.source === "sleeper-unavailable" ? 503 : 200
  return Response.json(recap satisfies LeagueRecap, { status, headers })
}
