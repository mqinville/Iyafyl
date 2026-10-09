import type { EmailOtpType } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"
import { authRoutes, safeNext } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const ALLOWED_TYPES: readonly string[] = ["email", "signup"]

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = safeNext(searchParams.get("next"))

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
