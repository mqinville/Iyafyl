import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

function readEmail(value: unknown): string | null {
  return typeof value === "string" && value ? value : null
}

/** Email of the signed-in user (from verified JWT claims), or null when signed out or Supabase is unset. */
export async function getUserEmail(): Promise<string | null> {
  const supabase = await createClient()
  if (!supabase) {
    return null
  }
  const { data } = await supabase.auth.getClaims()
  return readEmail(data?.claims?.email)
}

export interface SessionProfile {
  email: string | null
  displayName: string | null
}

async function loadSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient()
  if (!supabase) {
    return null
  }
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  const userId = claims?.sub
  if (!claims || !userId) {
    return null
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle()
  if (error) {
    console.error("Profile read failed", error)
  }

  return {
    email: readEmail(claims.email),
    displayName: data?.display_name ?? null,
  }
}

/** Signed-in user's profile, or null when signed out or Supabase is unset. */
export const getSessionProfile = cache(loadSessionProfile)
