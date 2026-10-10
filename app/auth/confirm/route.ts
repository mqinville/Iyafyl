import type { EmailOtpType } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { authRoutes, safeNext } from "@/lib/auth"
import type { Database } from "@/lib/supabase/database.types"
import { getSupabaseEnv } from "@/lib/supabase/env"

const ALLOWED_TYPES: readonly string[] = ["email", "signup"]

function isAllowedType(value: string): value is EmailOtpType {
  return ALLOWED_TYPES.includes(value)
}

function redirectTo(request: NextRequest, path: string): NextResponse {
  const url = request.nextUrl.clone()
  const parsed = new URL(path, request.url)
  url.pathname = parsed.pathname
  url.search = parsed.search
  const response = NextResponse.redirect(url)
  // Relative Location keeps the browser on the host it used, not the bind address.
  response.headers.set("location", `${url.pathname}${url.search}`)
  response.headers.set("referrer-policy", "no-referrer")
  return response
}

function logAuthFailure(label: string, error: { code?: string }): void {
  console.error(label, error.code ?? "unknown")
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const code = searchParams.get("code")
  const flowId = searchParams.get("sb_flow_id")
  const next = safeNext(searchParams.get("next"))

  const env = getSupabaseEnv()
  if (!env || (!tokenHash && !code)) {
    return redirectTo(request, authRoutes.authError)
  }

  const success = redirectTo(request, next)
  success.headers.set("cache-control", "private, no-store")

  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          success.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([key, value]) => {
          success.headers.set(key, value)
        })
      },
    },
  })

  if (tokenHash && type && isAllowedType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })
    if (error) {
      logAuthFailure("Supabase email confirmation failed", error)
      return redirectTo(request, authRoutes.authError)
    }
    return success
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    )
    if (error) {
      logAuthFailure("Supabase auth code exchange failed", error)
      return redirectTo(request, authRoutes.authError)
    }
    return success
  }

  return redirectTo(request, authRoutes.authError)
}
