import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/database.types"
import { getSupabaseEnv } from "@/lib/supabase/env"

/**
 * Service-role Supabase client. Bypasses RLS: only for trusted server jobs such
 * as Sleeper data ingestion; never import from client code. Null when env is unset.
 */
export function createAdminClient(): SupabaseClient<Database> | null {
  const env = getSupabaseEnv()
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!env || !secretKey) {
    return null
  }

  return createClient<Database>(env.url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
