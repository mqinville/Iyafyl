import type { SupabaseClient } from "@supabase/supabase-js"

import { upsertRows } from "@/data/shared/db"
import type {
  Database,
  Json,
  TablesInsert,
} from "@/lib/supabase/database.types"

import {
  flockGet,
  type CreatorMap,
  type FlockList,
  type FlockPlayer,
  type FlockRankingRow,
  type FlockRankingsResponse,
} from "./flock-api"

type SetInsert = TablesInsert<"flock_ranking_sets">
type RankingInsert = TablesInsert<"flock_rankings">
type CreatorInsert = TablesInsert<"flock_creator_rankings">

const CHUNK = 200
const PAGE = 1000
// Redraft lists hold ~370-390 players; far fewer means a bad response.
const MIN_LIST_ROWS = 100

export type FlockPlayers = Record<string, FlockPlayer>

export interface MappedRow {
  row: FlockRankingRow
  playerId: string
  /** True when /players had no entry and the raw playerId is the guess. */
  viaFallback: boolean
}

export interface TransformResult {
  mapped: MappedRow[]
  draftPicks: number
  unmapped: string[]
  duplicates: string[]
}

export interface ListRows {
  set: SetInsert
  rankings: RankingInsert[]
  creators: CreatorInsert[]
}

function toText(value: number | string | null | undefined): string | null {
  return value === null || value === undefined || value === ""
    ? null
    : String(value)
}

/**
 * Flock id to Sleeper id. The raw Flock playerId is not a Sleeper id: go
 * through /players (sleeper_id; team abbreviation for defenses, whose Sleeper
 * id is the team). With no /players entry the raw id is a fallback guess.
 */
export function resolvePlayerId(
  row: FlockRankingRow,
  flockPlayers: FlockPlayers,
): { id: string; viaFallback: boolean } | null {
  const entry = flockPlayers[String(row.playerId)]
  // Fallback matches also need a position match (see filterToKnownPlayers):
  // raw Flock ids collide with unrelated Sleeper ids (Flock 13242 is
  // Jeremiyah Love, Sleeper 13242 is another player).
  if (!entry) {
    return { id: String(row.playerId), viaFallback: true }
  }
  const sleeperId = toText(entry.sleeper_id)
  if (sleeperId) {
    return { id: sleeperId, viaFallback: false }
  }
  if ((entry.position ?? row.position) === "DEF") {
    const team = toText(entry.team ?? row.team)
    return team ? { id: team, viaFallback: false } : null
  }
  return null
}

/** Drops draft picks, maps ids, and reports rows that cannot be mapped. */
export function mapRows(
  rows: FlockRankingRow[],
  flockPlayers: FlockPlayers,
): TransformResult {
  const mapped = new Map<string, MappedRow>()
  const unmapped: string[] = []
  const duplicates: string[] = []
  let draftPicks = 0

  for (const row of rows) {
    if (row.isDraftPick) {
      draftPicks++
      continue
    }
    const resolved = resolvePlayerId(row, flockPlayers)
    if (!resolved) {
      unmapped.push(`${row.playerName ?? "?"} (${row.playerId})`)
      continue
    }
    if (mapped.has(resolved.id)) {
      duplicates.push(`${row.playerName ?? "?"} -> ${resolved.id}`)
    }
    mapped.set(resolved.id, {
      row,
      playerId: resolved.id,
      viaFallback: resolved.viaFallback,
    })
  }
  return { mapped: [...mapped.values()], draftPicks, unmapped, duplicates }
}

function creatorsIn(rows: FlockRankingRow[]): string[] {
  const names = new Set<string>()
  for (const row of rows) {
    for (const name of creatorNames(row)) {
      names.add(name)
    }
  }
  return [...names].sort()
}

function creatorMaps(row: FlockRankingRow): CreatorMap[] {
  return [
    row.overallRanks,
    row.overallTiers,
    row.positionalRanks,
    row.positionalTiers,
    row.weeklyOverallRanks,
    row.weeklyPositionalRanks,
  ].filter((map): map is CreatorMap => !!map)
}

/** Sorted creator names present in any of the row's per-creator maps. */
function creatorNames(row: FlockRankingRow): string[] {
  const names = new Set<string>()
  for (const map of creatorMaps(row)) {
    for (const name of Object.keys(map)) {
      names.add(name)
    }
  }
  return [...names].sort()
}

function num(value: number | null | undefined): number | null {
  return value === null || value === undefined ? null : value
}

function pick(map: CreatorMap | null | undefined, creator: string) {
  return num(map?.[creator])
}

export function toSetRow(
  list: FlockList,
  response: FlockRankingsResponse,
  rows: FlockRankingRow[],
  fetchedAt: string,
): SetInsert {
  return {
    list,
    subformat: response.subformat ?? null,
    season: response.year ?? null,
    fetched_at: fetchedAt,
    creator_updated_at: (response.lastUpdated ?? null) as Json,
    creators: creatorsIn(rows),
    expert_creators: response.expertEligibleCreators ?? null,
  }
}

export function toRankingRow(list: FlockList, item: MappedRow): RankingInsert {
  const { row } = item
  return {
    list,
    player_id: item.playerId,
    flock_player_id: String(row.playerId),
    average_rank: num(row.averageRank),
    initial_rank: num(row.initialRank),
    final_rank: num(row.finalRank),
    rank_delta: num(row.rankDelta),
    average_positional_rank: num(row.averagePositionalRank),
    average_tier: num(row.averageTier),
    average_positional_tier: num(row.averagePositionalTier),
    average_weekly_positional_rank: num(row.averageWeeklyPositionalRank),
    bye_week: num(row.byeWeek),
    is_special_teams: row.isSpecialTeams === true,
    raw: row as unknown as Json,
  }
}

/** One row per creator present in any of the row's per-creator maps. */
export function toCreatorRows(
  list: FlockList,
  item: MappedRow,
): CreatorInsert[] {
  const { row } = item
  return creatorNames(row).map((creator) => ({
    list,
    creator,
    player_id: item.playerId,
    overall_rank: pick(row.overallRanks, creator),
    overall_tier: pick(row.overallTiers, creator),
    positional_rank: pick(row.positionalRanks, creator),
    positional_tier: pick(row.positionalTiers, creator),
    weekly_overall_rank: pick(row.weeklyOverallRanks, creator),
    weekly_positional_rank: pick(row.weeklyPositionalRanks, creator),
  }))
}

export function buildListRows(
  list: FlockList,
  response: FlockRankingsResponse,
  mapped: MappedRow[],
  fetchedAt: string,
): ListRows {
  return {
    set: toSetRow(
      list,
      response,
      mapped.map((m) => m.row),
      fetchedAt,
    ),
    rankings: mapped.map((item) => toRankingRow(list, item)),
    creators: mapped.flatMap((item) => toCreatorRows(list, item)),
  }
}

export async function fetchFlockPlayers(): Promise<FlockPlayers> {
  const players = await flockGet<unknown>("/players")
  if (
    typeof players !== "object" ||
    players === null ||
    Array.isArray(players)
  ) {
    throw new Error("Flock /players did not return an object")
  }
  return players as FlockPlayers
}

export async function fetchRankings(
  list: FlockList,
): Promise<FlockRankingsResponse> {
  const response = await flockGet<FlockRankingsResponse | null>(
    `/rankings?format=${encodeURIComponent(list)}`,
  )
  if (!response || !Array.isArray(response.data)) {
    throw new Error(`Flock rankings for ${list} have no data array`)
  }
  return response
}

/** player_id -> position for every id that exists in public.players. */
async function loadPlayerPositions(
  client: SupabaseClient<Database>,
  ids: string[],
): Promise<Map<string, string | null>> {
  const found = new Map<string, string | null>()
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await client
      .from("players")
      .select("player_id, position")
      .in("player_id", ids.slice(i, i + CHUNK))
    if (error) {
      throw new Error(`Could not check players: ${error.message}`)
    }
    for (const player of data) {
      found.set(player.player_id, player.position)
    }
  }
  return found
}

/**
 * Keeps rows whose id exists in public.players (the FK). Fallback ids must
 * also match the Flock position. Returns the skipped rows' names.
 */
export async function filterToKnownPlayers(
  client: SupabaseClient<Database>,
  mapped: MappedRow[],
): Promise<{ kept: MappedRow[]; skipped: string[] }> {
  const positions = await loadPlayerPositions(
    client,
    mapped.map((m) => m.playerId),
  )
  const kept: MappedRow[] = []
  const skipped: string[] = []
  for (const item of mapped) {
    const known = positions.has(item.playerId)
    const positionOk =
      !item.viaFallback || positions.get(item.playerId) === item.row.position
    if (known && positionOk) {
      kept.push(item)
    } else {
      skipped.push(`${item.row.playerName ?? "?"} (${item.playerId})`)
    }
  }
  return { kept, skipped }
}

/** An empty or truncated list would otherwise delete the stored one. */
export function assertListSize(list: FlockList, count: number): void {
  if (count < MIN_LIST_ROWS) {
    throw new Error(
      `${list} has only ${count} rows (expected at least ` +
        `${MIN_LIST_ROWS}); refusing to continue`,
    )
  }
}

export interface WriteCounts {
  upserted: number
  deleted: number
}

/** Upserts set, consensus, creators; then removes rows no longer listed. */
export async function writeList(
  client: SupabaseClient<Database>,
  list: FlockList,
  rows: ListRows,
): Promise<WriteCounts> {
  await upsertRows(client, "flock_ranking_sets", [rows.set], ["list"])
  const rankings = await upsertRows(client, "flock_rankings", rows.rankings, [
    "list",
    "player_id",
  ])
  const creators = await upsertRows(
    client,
    "flock_creator_rankings",
    rows.creators,
    ["list", "creator", "player_id"],
  )

  const deleted = await deleteStale(client, list, rows)
  return { upserted: rankings + creators, deleted }
}

async function deleteStale(
  client: SupabaseClient<Database>,
  list: FlockList,
  rows: ListRows,
): Promise<number> {
  const keepPlayers = new Set(rows.rankings.map((r) => r.player_id))
  const keepPairs = new Set(
    rows.creators.map((c) => `${c.creator}\0${c.player_id}`),
  )
  let deleted = 0

  // Consensus rows (creator rows cascade).
  const stalePlayers: string[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("flock_rankings")
      .select("player_id")
      .eq("list", list)
      .order("player_id")
      .range(from, from + PAGE - 1)
    if (error) {
      throw new Error(`Could not list flock_rankings: ${error.message}`)
    }
    for (const r of data) {
      if (!keepPlayers.has(r.player_id)) {
        stalePlayers.push(r.player_id)
      }
    }
    if (data.length < PAGE) {
      break
    }
  }
  for (let i = 0; i < stalePlayers.length; i += CHUNK) {
    const { error } = await client
      .from("flock_rankings")
      .delete()
      .eq("list", list)
      .in("player_id", stalePlayers.slice(i, i + CHUNK))
    if (error) {
      throw new Error(`Could not delete flock_rankings: ${error.message}`)
    }
  }
  deleted += stalePlayers.length

  // Creator rows for pairs no longer present.
  const stalePairs: { creator: string; player_id: string }[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("flock_creator_rankings")
      .select("creator, player_id")
      .eq("list", list)
      .order("creator")
      .order("player_id")
      .range(from, from + PAGE - 1)
    if (error) {
      throw new Error(`Could not list flock_creator_rankings: ${error.message}`)
    }
    for (const r of data) {
      if (!keepPairs.has(`${r.creator}\0${r.player_id}`)) {
        stalePairs.push(r)
      }
    }
    if (data.length < PAGE) {
      break
    }
  }
  const byCreator = new Map<string, string[]>()
  for (const pair of stalePairs) {
    byCreator.set(pair.creator, [
      ...(byCreator.get(pair.creator) ?? []),
      pair.player_id,
    ])
  }
  for (const [creator, ids] of byCreator) {
    for (let i = 0; i < ids.length; i += CHUNK) {
      const { error } = await client
        .from("flock_creator_rankings")
        .delete()
        .eq("list", list)
        .eq("creator", creator)
        .in("player_id", ids.slice(i, i + CHUNK))
      if (error) {
        throw new Error(
          `Could not delete flock_creator_rankings: ${error.message}`,
        )
      }
    }
  }
  return deleted + stalePairs.length
}
