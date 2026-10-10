import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import {
  authRoutes,
  isPublicPath,
  safeNext,
  signedOutHomeDocument,
} from "@/lib/auth"
import type { Database } from "@/lib/supabase/database.types"
import { getSupabaseEnv } from "@/lib/supabase/env"

/**
 * Refreshes the Supabase auth cookie on each request and sends signed-out
 * visitors on non-public paths to /login?next=<path+search>. A confirmation
 * `code` or `token_hash` is forwarded to /auth/confirm first. A signed-out
 * document load of `/` is a hash-preserving bounce, because the default
 * Supabase email puts the session in the URL fragment. No-op when env is unset.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let response = NextResponse.next({ request })

  const env = getSupabaseEnv()
  if (!env) {
    return response
  }

  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        )
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
        // Cache headers keep a CDN from caching a Set-Cookie response and leaking a session.
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        )
      },
    },
  })

  // Required: validates the token and triggers the refresh. Keep nothing between client creation and this call.
  const { data } = await supabase.auth.getClaims()

  const { pathname, search } = request.nextUrl
  if (!data?.claims && pathname !== authRoutes.confirm) {
    const tokenHash = request.nextUrl.searchParams.get("token_hash")
    const otpType = request.nextUrl.searchParams.get("type")
    const code = request.nextUrl.searchParams.get("code")
    if (tokenHash && otpType) {
      return confirmRedirect(request, response, {
        token_hash: tokenHash,
        type: otpType,
      })
    }
    if (code) {
      return confirmRedirect(request, response, { code })
    }
  }

  if (
    !data?.claims &&
    pathname === authRoutes.home &&
    search === "" &&
    isDocumentNavigation(request)
  ) {
    const bounce = new NextResponse(signedOutHomeDocument(), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "private, no-store",
        "x-robots-tag": "noindex",
      },
    })
    return applySessionCookies(bounce, response)
  }

  if (!data?.claims && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = authRoutes.signIn
    url.search = ""
    const original = pathname + search
    if (original !== authRoutes.home) {
      url.searchParams.set("next", original)
    }
    return applySessionCookies(NextResponse.redirect(url), response)
  }

  return response
}

// Next removes flight headers (rsc, next-router-prefetch) before proxy runs,
// so a missing header is not a document load. Browser navigations set
// Sec-Fetch-Dest: document; router fetches set empty.
function isDocumentNavigation(request: NextRequest): boolean {
  return request.headers.get("sec-fetch-dest") === "document"
}

function applySessionCookies(
  target: NextResponse,
  sessionResponse: NextResponse,
): NextResponse {
  sessionResponse.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie)
  })
  for (const key of ["cache-control", "expires", "pragma"]) {
    const value = sessionResponse.headers.get(key)
    if (value) {
      target.headers.set(key, value)
    }
  }
  return target
}

function confirmRedirect(
  request: NextRequest,
  sessionResponse: NextResponse,
  params: Record<string, string>,
): NextResponse {
  const url = request.nextUrl.clone()
  const nextTarget = request.nextUrl.clone()
  for (const key of ["code", "token_hash", "type", "next", "sb_flow_id"]) {
    nextTarget.searchParams.delete(key)
  }
  const explicitNext = request.nextUrl.searchParams.get("next")
  const next = safeNext(explicitNext ?? nextTarget.pathname + nextTarget.search)
  url.pathname = authRoutes.confirm
  url.search = ""
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  const flowId = request.nextUrl.searchParams.get("sb_flow_id")
  if (flowId) {
    url.searchParams.set("sb_flow_id", flowId)
  }
  if (next !== authRoutes.home) {
    url.searchParams.set("next", next)
  }
  return applySessionCookies(NextResponse.redirect(url), sessionResponse)
}
