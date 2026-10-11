import { upsertRows } from "@/data/shared/db"
import type { RunContext } from "@/data/shared/runs"
import { fetchJson, SLEEPER_API } from "@/data/shared/sleeper"
import type { Json, TablesInsert } from "@/lib/supabase/database.types"

import type { SleeperPlayer } from "./sleeper-types"

type PlayerInsert = TablesInsert<"players">

/** "71" or `6'2"` to inches; null for anything else. */
export function parseHeight(height: string | null | undefined): number | null {
  if (!height) {
    return null
  }
  if (/^\d+$/.test(height)) {
    return Number(height)
  }
  const match = /^(\d+)'\s*(\d+)"?$/.exec(height)
  return match ? Number(match[1]) * 12 + Number(match[2]) : null
}

function parseWeight(weight: string | null | undefined): number | null {
  return weight && /^\d+$/.test(weight) ? Number(weight) : null
}

function normalizeInjury(status: string | null | undefined): string | null {
  return status && status !== "NA" ? status : null
}

function toText(value: number | string | null | undefined): string | null {
  return value === null || value === undefined ? null : String(value)
}

function toRow(player: SleeperPlayer): PlayerInsert {
  const fullName =
    player.full_name ??
    [player.first_name, player.last_name].filter(Boolean).join(" ")
  return {
    player_id: player.player_id,
    full_name: fullName,
    first_name: player.first_name ?? null,
    last_name: player.last_name ?? null,
    position: player.position ?? null,
    fantasy_positions: player.fantasy_positions ?? null,
    team: player.team ?? null,
    status: player.status ?? null,
    injury_status: normalizeInjury(player.injury_status),
    active: player.active ?? false,
    birth_date: player.birth_date ?? null,
    college: player.college ?? null,
    years_exp: player.years_exp ?? null,
    jersey_number: player.number ?? null,
    height_in: parseHeight(player.height),
    weight_lb: parseWeight(player.weight),
    gsis_id: player.gsis_id ?? null,
    espn_id: toText(player.espn_id),
    yahoo_id: toText(player.yahoo_id),
    sportradar_id: player.sportradar_id ?? null,
    raw: player as unknown as Json,
  }
}

// Sleeper asks clients to fetch /players/nfl at most once a day; 20h leaves
// a little slack for manual reruns.
const MIN_HOURS_BETWEEN_FETCHES = 20

/**
 * Sleeper asks for at most one /players/nfl call a day. True when a metadata
 * run succeeded recently. Callers check this before starting a sync run, so a
 * skip is never logged as a fetch.
 */
export async function fetchedRecently({
  client,
}: RunContext): Promise<boolean> {
  const since = new Date(
    Date.now() - MIN_HOURS_BETWEEN_FETCHES * 3_600_000,
  ).toISOString()
  const { data, error } = await client
    .from("sync_runs")
    .select("id")
    .eq("job", "player:metadata")
    .eq("status", "succeeded")
    .gte("started_at", since)
    .limit(1)
  if (error) {
    throw new Error(`Could not check recent metadata runs: ${error.message}`)
  }
  return data.length > 0
}

/**
 * Upserts every player Sleeper lists. Players are never deleted: retired ones
 * still own historical stat rows.
 */
export async function syncPlayers(ctx: RunContext): Promise<number> {
  if (ctx.dryRun) {
    console.log("Dry run: still downloading /players/nfl (about 15MB).")
  }
  const byId = await fetchJson<Record<string, SleeperPlayer>>(
    `${SLEEPER_API}/players/nfl`,
  )
  const rows = Object.values(byId).map(toRow)
  console.log(`Fetched ${rows.length} players.`)
  if (ctx.dryRun) {
    console.log("Dry run: nothing written.")
    return 0
  }
  const written = await upsertRows(ctx.client, "players", rows, ["player_id"])
  console.log(`Upserted ${written} players.`)
  return written
}
