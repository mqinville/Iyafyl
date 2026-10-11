import type { NextRequest } from "next/server"

import { getPlayerCard } from "@/lib/server/players"
import type { PlayerCardErrorResponse, PlayerCardResponse } from "@/lib/types"

const headers = { "Cache-Control": "private, no-store" }
const PLAYER_ID_PATTERN = /^[A-Za-z0-9_]{1,20}$/

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/players/[playerId]">,
) {
  const { playerId } = await ctx.params
  if (!PLAYER_ID_PATTERN.test(playerId)) {
    return Response.json(
      { error: "not_found" } satisfies PlayerCardErrorResponse,
      { status: 404, headers },
    )
  }

  const outcome = await getPlayerCard(playerId)
  if (outcome.status === "ok") {
    return Response.json({ card: outcome.card } satisfies PlayerCardResponse, {
      headers,
    })
  }

  const code = {
    not_found: 404,
    unauthorized: 401,
    unavailable: 503,
  }[outcome.status]
  return Response.json(
    { error: outcome.status } satisfies PlayerCardErrorResponse,
    { status: code, headers },
  )
}
