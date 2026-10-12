import { getLeagueSummary } from "@/lib/server/sleeper"
import type { LeagueSummary } from "@/lib/types"

const headers = { "Cache-Control": "private, no-store" }

export async function GET() {
  const summary = await getLeagueSummary()
  const status = summary.source === "sleeper-unavailable" ? 503 : 200
  return Response.json(summary satisfies LeagueSummary, { status, headers })
}
