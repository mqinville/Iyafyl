import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/lib/supabase/database.types"
import { getSupabaseEnv } from "@/lib/supabase/env"

/** Refreshes the Supabase auth cookie on each request. No-op when env is unset. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })

  const env = getSupabaseEnv()
  if (!env) return response

  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
        // Cache headers keep a CDN from caching a Set-Cookie response and leaking a session.
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value)
        )
      },
    },
  })

  // Required: validates the token and triggers the refresh. Keep nothing between client creation and this call.
  await supabase.auth.getClaims()

  return response
}
