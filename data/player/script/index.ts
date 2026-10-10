import { parseArgs } from "node:util"

import { getAdminClient } from "@/data/shared/db"
import { withSyncRun, type RunContext } from "@/data/shared/runs"
import { fetchJson, SLEEPER_API } from "@/data/shared/sleeper"

import { loadKnownPlayerIds, syncSeasonStats } from "./game-stats"
import { fetchedRecently, syncPlayers } from "./metadata"
import { SEASON_TYPES, syncSchedule, type SeasonType } from "./schedule"
import type { SleeperState } from "./sleeper-types"

const FIRST_SEASON = 2009

const USAGE = `Usage: bun run data:player <job> [flags]

Jobs:
  metadata                          Sleeper players -> players
  schedule  --season <n> [--season-type regular|post]
  stats     --season <n>            schedule + weekly stats + bye/inactive fill
  backfill  --from <n> [--to <n>]   stats for every season in the range

Seasons run from ${FIRST_SEASON} to the current season; the current,
in-progress season is safe to re-run.

Flags: --dry-run (no writes; metadata still downloads /players/nfl),
       --allow-remote (permit a non-local Supabase),
       --force (metadata: refetch players even if synced in the last 20h),
       -h, --help`

const OPTIONS = {
  "dry-run": { type: "boolean" },
  "allow-remote": { type: "boolean" },
  force: { type: "boolean" },
  help: { type: "boolean", short: "h" },
  season: { type: "string" },
  "season-type": { type: "string" },
  from: { type: "string" },
  to: { type: "string" },
} as const

function usageError(message: string): never {
  console.error(`${message}\n\n${USAGE}`)
  process.exit(1)
}

function intFlag(name: string, value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!/^\d+$/.test(value)) {
    usageError(`--${name} must be a non-negative integer, got "${value}".`)
  }
  return Number(value)
}

function requireInt(name: string, value: string | undefined): number {
  return intFlag(name, value) ?? usageError(`--${name} is required.`)
}

type Command =
  | { job: "metadata"; force: boolean }
  | { job: "schedule"; season: number; types: SeasonType[] }
  | { job: "stats"; season: number }
  | { job: "backfill"; from: number; to: number | undefined }

function parseCommandLine() {
  try {
    return parseArgs({
      args: process.argv.slice(2),
      options: OPTIONS,
      strict: true,
      allowPositionals: true,
    })
  } catch (error) {
    return usageError(error instanceof Error ? error.message : String(error))
  }
}

type Flags = ReturnType<typeof parseCommandLine>["values"]

/** Validates the job and everything that needs only the command line. */
function parseCommand(flags: Flags, job: string | undefined): Command {
  switch (job) {
    case undefined:
      return usageError("Missing job.")
    case "metadata":
      return { job, force: flags.force ?? false }
    case "schedule": {
      const season = requireInt("season", flags.season)
      const type = flags["season-type"]
      if (type === undefined) {
        return { job, season, types: SEASON_TYPES }
      }
      if (type !== "regular" && type !== "post") {
        return usageError(
          `--season-type must be regular or post, got "${type}".`,
        )
      }
      return { job, season, types: [type] }
    }
    case "stats":
      return { job, season: requireInt("season", flags.season) }
    case "backfill":
      return {
        job,
        from: requireInt("from", flags.from),
        to: intFlag("to", flags.to),
      }
    default:
      return usageError(`Unknown job "${job}".`)
  }
}

function checkSeason(name: string, season: number, maxSeason: number): number {
  if (season < FIRST_SEASON || season > maxSeason) {
    usageError(
      `--${name} must be between ${FIRST_SEASON} and ${maxSeason}, got ${season}.`,
    )
  }
  return season
}

async function currentSeason(): Promise<number> {
  const state = await fetchJson<SleeperState>(`${SLEEPER_API}/state/nfl`)
  const season = Number(state.season)
  if (!Number.isInteger(season) || season < FIRST_SEASON) {
    throw new Error(`Unexpected season from /state/nfl: "${state.season}".`)
  }
  return season
}

async function runStats(
  ctx: RunContext,
  seasons: number[],
  resumeTo?: number,
): Promise<number> {
  const known = await loadKnownPlayerIds(ctx.client)
  let written = 0
  for (const season of seasons) {
    console.log(`Season ${season}`)
    try {
      const rows = await syncSeasonStats(ctx, season, known)
      written += rows
      console.log(`Season ${season} done: ${rows} rows (total ${written})`)
    } catch (error) {
      // Names the season so sync_runs.error shows where a backfill stopped.
      const message = error instanceof Error ? error.message : String(error)
      const resume =
        resumeTo === undefined
          ? ""
          : ` Resume with: bun run data:player backfill --from ${season} --to ${resumeTo}`
      throw new Error(
        `Season ${season}: ${message.replace(/\.$/, "")}.${resume}`,
        {
          cause: error,
        },
      )
    }
  }
  return written
}

async function main(): Promise<void> {
  // Usage errors win over env errors, so the command is parsed before the
  // Supabase client is created.
  const { values: flags, positionals } = parseCommandLine()
  if (flags.help) {
    console.log(USAGE)
    return
  }
  const command = parseCommand(flags, positionals[0])

  const ctx: RunContext = {
    client: getAdminClient({ allowRemote: flags["allow-remote"] ?? false }),
    dryRun: flags["dry-run"] ?? false,
  }

  // Runs fn inside a sync_runs entry unless this is a dry run.
  const track = (
    name: string,
    args: Record<string, string | number>,
    fn: () => Promise<number>,
  ): Promise<number> =>
    ctx.dryRun ? fn() : withSyncRun(ctx.client, name, args, fn)

  switch (command.job) {
    case "metadata":
      // Dry runs write nothing, so they skip the once-a-day guard.
      if (!ctx.dryRun && !command.force && (await fetchedRecently(ctx))) {
        console.log(
          "Players were synced in the last 20h; skipping (pass --force to override).",
        )
        break
      }
      await track("player:metadata", {}, () => syncPlayers(ctx))
      break
    case "schedule": {
      const { types } = command
      const season = checkSeason(
        "season",
        command.season,
        await currentSeason(),
      )
      await track(
        "player:schedule",
        { season, season_type: types.join(",") },
        () => syncSchedule(ctx, season, types),
      )
      break
    }
    case "stats": {
      const season = checkSeason(
        "season",
        command.season,
        await currentSeason(),
      )
      await track("player:stats", { season }, () => runStats(ctx, [season]))
      break
    }
    case "backfill": {
      const maxSeason = await currentSeason()
      const from = checkSeason("from", command.from, maxSeason)
      const to =
        command.to === undefined
          ? maxSeason
          : checkSeason("to", command.to, maxSeason)
      if (from > to) {
        usageError(`--from (${from}) must not be after --to (${to}).`)
      }
      const seasons = Array.from({ length: to - from + 1 }, (_, i) => from + i)
      await track("player:backfill", { from, to }, () =>
        runStats(ctx, seasons, to),
      )
      break
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
