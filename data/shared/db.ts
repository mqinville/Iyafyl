import type { SupabaseClient } from "@supabase/supabase-js"

import { createAdminClient } from "@/lib/supabase/admin"
import type { Database, TablesInsert } from "@/lib/supabase/database.types"
import { getSupabaseEnv } from "@/lib/supabase/env"

export type TableName = keyof Database["public"]["Tables"]

const LOCAL_HOSTS = ["127.0.0.1", "localhost"]
const WRITE_CHUNK = 500

/**
 * Service-role client for ingestion scripts. Refuses non-local Supabase URLs
 * unless allowRemote is set, so a stray .env.local can never write to the
 * hosted project by accident.
 */
export function getAdminClient(options: {
  allowRemote: boolean
}): SupabaseClient<Database> {
  const client = createAdminClient()
  const env = getSupabaseEnv()
  if (!client || !env) {
    throw new Error(
      "Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY in .env.local.",
    )
  }

  const host = new URL(env.url).hostname
  if (!LOCAL_HOSTS.includes(host) && !options.allowRemote) {
    throw new Error(
      `Refusing to run against ${host}: it is not the local Supabase stack. Pass --allow-remote to write to it deliberately.`,
    )
  }
  return client
}

/**
 * Upserts rows in chunks of 500 and returns the number written. keyColumns
 * must match a unique constraint. Rows are deduped by them (last one wins)
 * because Postgres rejects a single statement that touches the same key twice
 * ("ON CONFLICT DO UPDATE command cannot affect row a second time").
 */
export async function upsertRows<T extends TableName>(
  client: SupabaseClient<Database>,
  table: T,
  rows: TablesInsert<T>[],
  keyColumns: readonly string[],
): Promise<number> {
  const onConflict = keyColumns.join(",")
  const unique = new Map<string, TablesInsert<T>>()
  for (const row of rows) {
    const record = row as Record<string, unknown>
    unique.set(JSON.stringify(keyColumns.map((column) => record[column])), row)
  }
  const deduped = [...unique.values()]

  for (let offset = 0; offset < deduped.length; offset += WRITE_CHUNK) {
    const chunk = deduped.slice(offset, offset + WRITE_CHUNK)
    // supabase-js cannot resolve the Insert type for a generic table name;
    // callers are already checked against TablesInsert<T>, so cast here only.
    const { error } = await client
      .from(table)
      .upsert(chunk as never, { onConflict })
    if (error) {
      throw new Error(
        `Upsert into ${table} failed at offset ${offset}: ${error.message}`,
      )
    }
  }
  return deduped.length
}
