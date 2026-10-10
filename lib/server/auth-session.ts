import "server-only"

import { createClient } from "@/lib/supabase/server"

/** Email of the signed-in user (from verified JWT claims), or null when signed out or Supabase is unset. */
export async function getUserEmail(): Promise<string | null> {
  const supabase = await createClient()
  if (!supabase) {
    return null
  }
  const { data } = await supabase.auth.getClaims()
  const email = data?.claims?.email
  return typeof email === "string" && email ? email : null
}
