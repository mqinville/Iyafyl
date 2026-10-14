import type { NextRequest } from "next/server"

import type { TradeRankResponse } from "@/lib/rankings"
import { getTradeRanks, type TradeRanksOutcome } from "@/lib/server/trade-ranks"

const headers = { "Cache-Control": "private, no-store" }

const STATUS: Record<Exclude<TradeRanksOutcome["status"], "ok">, number> = {
  unauthorized: 401,
  bad_request: 400,
  unavailable: 503,
}

export async function GET(request: NextRequest) {
  const id = (request.nextUrl.searchParams.get("id") ?? "").trim()
  const outcome = await getTradeRanks(id)

  if (outcome.status === "ok") {
    return Response.json({ ranks: outcome.ranks } satisfies TradeRankResponse, {
      headers,
    })
  }
  return Response.json(
    { error: outcome.status },
    { status: STATUS[outcome.status], headers },
  )
}
