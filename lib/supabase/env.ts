export interface SupabaseEnv {
  url: string
  publishableKey: string
}

/** Public Supabase settings, or null when unset. Literal access so Next inlines NEXT_PUBLIC_ vars. */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) {
    return null
  }
  return { url, publishableKey }
}
