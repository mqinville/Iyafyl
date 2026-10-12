import { parseArgs } from "node:util"

import { getAdminClient } from "@/data/shared/db"
import { withSyncRun, type RunContext } from "@/data/shared/runs"

import { FLOCK_LISTS, type FlockList } from "./flock-api"
import {
  assertListSize,
  buildListRows,
  fetchFlockPlayers,
  fetchRankings,
  filterToKnownPlayers,
  mapRows,
  writeList,
  type FlockPlayers,
} from "./rankings"

const USAGE = `Usage: bun run data:flock [flags]

Fetches Flock Fantasy redraft rankings (consensus and every creator) and
upserts them into flock_ranking_sets, flock_rankings and
flock_creator_rankings. Rows no longer in a list are deleted.

Flags: --list REDRAFT|REDRAFT_SF (default: both),
       --dry-run (fetch and map, no writes; still reads public.players),
       --allow-remote (permit a non-local Supabase),
       -h, --help`

const OPTIONS = {
  list: { type: "string" },
  "dry-run": { type: "boolean" },
  "allow-remote": { type: "boolean" },
  help: { type: "boolean", short: "h" },
} as const

function usageError(message: string): never {
  console.error(`${message}\n\n${USAGE}`)
  process.exit(1)
}

function parseCommandLine() {
  try {
    return parseArgs({
      args: process.argv.slice(2),
      options: OPTIONS,
      strict: true,
      allowPositionals: false,
    })
  } catch (error) {
    return usageError(error instanceof Error ? error.message : String(error))
  }
}

function parseList(value: string): FlockList {
  const match = FLOCK_LISTS.find((list) => list === value)
  return (
    match ?? usageError(`--list must be REDRAFT or REDRAFT_SF, got "${value}".`)
  )
}

function preview(names: string[]): string {
  const shown = names.slice(0, 20).join(", ")
  return names.length > 20 ? `${shown}, ... +${names.length - 20} more` : shown
}

async function syncList(
  { client, dryRun }: RunContext,
  list: FlockList,
  flockPlayers: FlockPlayers,
): Promise<number> {
  const response = await fetchRankings(list)
  const fetchedAt = new Date().toISOString()
  const { mapped, draftPicks, unmapped, duplicates } = mapRows(
    response.data,
    flockPlayers,
  )
  const { kept, skipped } = await filterToKnownPlayers(client, mapped)
  const rows = buildListRows(list, response, kept, fetchedAt)
  // Before the dry-run branch: a dry run refuses a truncated list too.
  assertListSize(list, rows.rankings.length)

  console.log(
    `${list}: fetched ${response.data.length}, mapped ${mapped.length}, kept ${kept.length}, creators ${rows.set.creators.length}, creator rows ${rows.creators.length}`,
  )
  console.log(`  skipped ${draftPicks} draft picks`)
  if (unmapped.length > 0) {
    console.log(`  skipped ${unmapped.length} unmapped: ${preview(unmapped)}`)
  }
  if (duplicates.length > 0) {
    console.log(
      `  ${duplicates.length} duplicate ids (last wins): ${preview(duplicates)}`,
    )
  }
  if (skipped.length > 0) {
    console.log(
      `  skipped ${skipped.length} not in players: ${preview(skipped)}`,
    )
  }
  if (dryRun) {
    console.log("  dry run: nothing written")
    return 0
  }

  const { upserted, deleted } = await writeList(client, list, rows)
  console.log(`  upserted ${upserted}, deleted ${deleted}`)
  return upserted
}

async function main(): Promise<void> {
  const { values } = parseCommandLine()
  if (values.help) {
    console.log(USAGE)
    return
  }
  const lists =
    values.list === undefined ? FLOCK_LISTS : [parseList(values.list)]
  const dryRun = values["dry-run"] ?? false
  const client = getAdminClient({
    allowRemote: values["allow-remote"] ?? false,
  })
  const ctx: RunContext = { client, dryRun }

  const run = async (): Promise<number> => {
    const flockPlayers = await fetchFlockPlayers()
    console.log(`Flock /players: ${Object.keys(flockPlayers).length} entries`)
    let total = 0
    for (const list of lists) {
      total += await syncList(ctx, list, flockPlayers)
    }
    return total
  }

  if (dryRun) {
    await run()
  } else {
    await withSyncRun(client, "flock:rankings", { lists: [...lists] }, run)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
