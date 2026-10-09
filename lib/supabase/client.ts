import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/database.types"
import { getSupabaseEnv } from "@/lib/supabase/env"

/** Browser Supabase client for "use client" components. Null when env is unset. */
export function createClient(): SupabaseClient<Database> | null {
  const env = getSupabaseEnv()
  if (!env) return null

  return createBrowserClient<Database>(env.url, env.publishableKey)
}
