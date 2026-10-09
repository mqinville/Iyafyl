import "server-only"

import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import type { Database } from "@/lib/supabase/database.types"
import { getSupabaseEnv } from "@/lib/supabase/env"

/** Cookie-aware Supabase client for Server Components, actions and route handlers. Null when env is unset. */
export async function createClient(): Promise<SupabaseClient<Database> | null> {
  const env = getSupabaseEnv()
  if (!env) {
    return null
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Called from a Server Component; the proxy refreshes the session.
        }
      },
    },
  })
}
