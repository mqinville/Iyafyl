import type { NextRequest } from "next/server"

import { searchPlayers } from "@/lib/server/players"
import type { PlayerSearchResponse } from "@/lib/types"

const headers = { "Cache-Control": "private, no-store" }

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? ""
  const outcome = await searchPlayers(q)

  if (outcome.status === "ok") {
    return Response.json(
      { results: outcome.results } satisfies PlayerSearchResponse,
      { headers },
    )
  }
  return Response.json(
    { error: outcome.status },
    { status: outcome.status === "unauthorized" ? 401 : 503, headers },
  )
}
