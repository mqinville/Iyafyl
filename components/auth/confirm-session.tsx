"use client"

import { useEffect, type FC } from "react"
import { authRoutes } from "@/lib/auth"
import { createClient } from "@/lib/supabase/client"

interface ConfirmSessionProps {
  next: string
}

// Adopts a session that arrived in the URL hash (the default Supabase
// confirmation redirect). Tokens stay in the effect and are never rendered.
export const ConfirmSession: FC<ConfirmSessionProps> = ({ next }) => {
  useEffect(() => {
    let cancelled = false
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    if (hash.get("error") || hash.get("error_code")) {
      window.location.replace(authRoutes.authError)
      return
    }

    const accessToken = hash.get("access_token")
    const refreshToken = hash.get("refresh_token")
    const type = hash.get("type")
    if (!accessToken || !refreshToken) {
      window.location.replace(authRoutes.signIn)
      return
    }
    if (type && type !== "signup" && type !== "email") {
      window.location.replace(authRoutes.authError)
      return
    }

    const supabase = createClient()
    if (!supabase) {
      window.location.replace(authRoutes.authError)
      return
    }

    void supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error }) => {
        if (cancelled) {
          return
        }
        if (error) {
          window.location.replace(authRoutes.authError)
          return
        }
        window.location.replace(next)
      })
      .catch(() => {
        if (!cancelled) {
          window.location.replace(authRoutes.authError)
        }
      })

    return () => {
      cancelled = true
    }
  }, [next])

  return null
}
