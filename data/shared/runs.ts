import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  Database,
  Json,
  TablesUpdate,
} from "@/lib/supabase/database.types"

/** What every job needs: a client, and whether writes are allowed. */
export interface RunContext {
  client: SupabaseClient<Database>
  dryRun: boolean
}

/**
 * Logs a job to sync_runs: running, then succeeded (with the row count fn
 * returns) or failed (with the error message, rethrown). Ctrl-C or SIGTERM
 * marks the run failed ("interrupted") before exiting. A row left "running"
 * means the process was hard-killed. Callers skip this on dry runs so nothing
 * is written.
 */
export async function withSyncRun(
  client: SupabaseClient<Database>,
  job: string,
  args: Record<string, Json>,
  fn: () => Promise<number>,
): Promise<number> {
  const { data, error } = await client
    .from("sync_runs")
    .insert({ job, args, status: "running" })
    .select("id")
    .single()
  if (error || !data) {
    throw new Error(
      `Could not start sync run: ${error?.message ?? "no row returned"}`,
    )
  }

  const finish = async (fields: TablesUpdate<"sync_runs">): Promise<void> => {
    const result = await client
      .from("sync_runs")
      .update({ ...fields, finished_at: new Date().toISOString() })
      .eq("id", data.id)
    if (result.error) {
      throw new Error(
        `Could not update sync run ${data.id}: ${result.error.message}`,
      )
    }
  }
  // Used where another error is already being reported.
  const finishQuietly = (fields: TablesUpdate<"sync_runs">): Promise<void> =>
    finish(fields).catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error)
    })

  const interrupt = (exitCode: number) => async (): Promise<void> => {
    await finishQuietly({ status: "failed", error: "interrupted" })
    process.exit(exitCode)
  }
  const onSigint = interrupt(130)
  const onSigterm = interrupt(143)
  process.once("SIGINT", onSigint)
  process.once("SIGTERM", onSigterm)

  try {
    const rowsWritten = await fn()
    await finish({ status: "succeeded", rows_written: rowsWritten })
    return rowsWritten
  } catch (err) {
    await finishQuietly({
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  } finally {
    process.off("SIGINT", onSigint)
    process.off("SIGTERM", onSigterm)
  }
}
