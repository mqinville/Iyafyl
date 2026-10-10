export const SLEEPER_API = "https://api.sleeper.app/v1"
export const SLEEPER_STATS_API = "https://api.sleeper.com"

const TIMEOUT_MS = 60_000
const MAX_ATTEMPTS = 3
const BACKOFF_MS = 1_000
// Sleeper asks for under 1,000 calls/minute; 100ms keeps us near 600.
const MIN_GAP_MS = 100

let nextSlot = 0

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Spaces out calls module-wide to stay under the rate limit. */
async function throttle(): Promise<void> {
  const now = Date.now()
  const start = Math.max(now, nextSlot)
  nextSlot = start + MIN_GAP_MS
  if (start > now) {
    await sleep(start - now)
  }
}

/**
 * GET a Sleeper URL and parse the JSON body. Retries network errors, 429 and
 * 5xx with exponential backoff; any other non-2xx fails immediately.
 */
export async function fetchJson<T>(url: string): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await sleep(BACKOFF_MS * 2 ** (attempt - 2))
    }
    await throttle()

    // The body read is inside the try so a truncated or timed-out body is
    // retried like a network error.
    let response: Response
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (response.ok) {
        return (await response.json()) as T
      }
    } catch (error) {
      lastError = new Error(
        `Network error for ${url}: ${error instanceof Error ? error.message : String(error)}`,
      )
      continue
    }

    lastError = new Error(`HTTP ${response.status} for ${url}`)
    if (response.status !== 429 && response.status < 500) {
      break
    }
  }

  throw lastError
}
