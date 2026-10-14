import "server-only"

import {
  FLOCK_LISTS,
  type FlockList,
  type TradeRankEntry,
} from "@/lib/rankings"
import { createClient } from "@/lib/supabase/server"

const MAX_ID_LENGTH = 20
const ID_PATTERN = /^[A-Za-z0-9]+$/
const LISTS = FLOCK_LISTS.map((list) => list.value)

function isFlockList(value: string): value is FlockList {
  return LISTS.some((list) => list === value)
}

export type TradeRanksOutcome =
  | { status: "ok"; ranks: TradeRankEntry }
  | { status: "unauthorized" }
  | { status: "bad_request" }
  | { status: "unavailable" }

export async function getTradeRanks(id: string): Promise<TradeRanksOutcome> {
  if (id.length === 0 || id.length > MAX_ID_LENGTH || !ID_PATTERN.test(id)) {
    return { status: "bad_request" }
  }

  const supabase = await createClient()
  if (!supabase) {
    return { status: "unavailable" }
  }

  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) {
    return { status: "unauthorized" }
  }

  const { data, error } = await supabase
    .from("flock_rankings")
    .select("list, average_rank")
    .in("list", LISTS)
    .eq("player_id", id)
  if (error) {
    console.error("Trade ranks lookup failed", error)
    return { status: "unavailable" }
  }

  const ranks: TradeRankEntry = { REDRAFT: null, REDRAFT_SF: null }
  for (const row of data) {
    const value = row.average_rank === null ? NaN : Number(row.average_rank)
    if (Number.isFinite(value) && isFlockList(row.list)) {
      ranks[row.list] = value
    }
  }
  return { status: "ok", ranks }
}
