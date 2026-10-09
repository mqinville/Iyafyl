import type { EmailOtpType } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"
import { authRoutes } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const ALLOWED_TYPES: readonly string[] = ["email", "signup"]

// Same-origin path only: resolve against our origin and compare, so tricks like
// "//host", "/\host" or "/%09/host" can't point elsewhere.
function safeNext(value: string | null, origin: string): string {
  if (!value) return authRoutes.home
  try {
    const url = new URL(value, origin)
    return url.origin === origin ? url.pathname + url.search : authRoutes.home
  } catch {
    return authRoutes.home
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = safeNext(searchParams.get("next"), origin)

  const supabase = await createClient()
  if (!supabase || !tokenHash || !type || !ALLOWED_TYPES.includes(type)) {
    redirect(authRoutes.authError)
  }

  const { error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash: tokenHash,
  })
  if (error) {
    console.error("Supabase email confirmation failed", error)
    redirect(authRoutes.authError)
  }

  redirect(next)
}
