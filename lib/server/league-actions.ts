"use server"

import { revalidatePath } from "next/cache"
import { parseLeagueId } from "@/lib/league-id"
import { createClient } from "@/lib/supabase/server"

export interface LeagueIdFormState {
  status: "idle" | "error" | "success"
  message: string
  leagueId: string
}

export const initialLeagueIdFormState: LeagueIdFormState = {
  status: "idle",
  message: "",
  leagueId: "",
}

const UNAVAILABLE_MESSAGE =
  "Accounts are unavailable right now, so this can't be saved."
const INVALID_MESSAGE = "Use digits only, up to 20 characters."
const SIGN_IN_MESSAGE = "Sign in to save a league id."
const GENERIC_MESSAGE = "Couldn't save the league id. Try again."

function result(
  status: LeagueIdFormState["status"],
  message: string,
  leagueId: string,
): LeagueIdFormState {
  return { status, message, leagueId }
}

export async function saveLeagueIdAction(
  _prev: LeagueIdFormState,
  formData: FormData,
): Promise<LeagueIdFormState> {
  const raw = String(formData.get("leagueId") ?? "")
  const parsed = parseLeagueId(raw)
  if (!parsed.ok) {
    return result("error", INVALID_MESSAGE, raw.trim())
  }

  const supabase = await createClient()
  if (!supabase) {
    return result("error", UNAVAILABLE_MESSAGE, raw.trim())
  }

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) {
    return result("error", SIGN_IN_MESSAGE, raw.trim())
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ league_id: parsed.leagueId })
    .eq("id", userId)
    .select("league_id")
    .maybeSingle()

  if (error) {
    console.error("League id update failed", error)
    return result("error", GENERIC_MESSAGE, raw.trim())
  }
  if (!data) {
    console.error("League id update matched no profile")
    return result("error", GENERIC_MESSAGE, raw.trim())
  }

  // Home standings and the header (root layout) both read the league id.
  revalidatePath("/", "layout")
  return result(
    "success",
    parsed.leagueId ? "Saved." : "Cleared.",
    data.league_id ?? "",
  )
}
