export const FLOCK_API = "https://api.flockfantasy.com"
// Mirrors FLOCK_LISTS in lib/rankings.ts and the list check constraint plus
// the player_rankings validation in supabase/migrations/20261011120000_flock_rankings.sql.
export const FLOCK_LISTS = ["REDRAFT", "REDRAFT_SF"] as const
export type FlockList = (typeof FLOCK_LISTS)[number]

const USER_AGENT = "IyafylLeagueBot/1.0 (private league site)"
const TIMEOUT_MS = 60_000
const MAX_ATTEMPTS = 3
const BACKOFF_MS = 2_000
// The API is undocumented and unauthenticated; stay gentle.
const MIN_GAP_MS = 1_200

let nextSlot = 0

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function throttle(): Promise<void> {
  const now = Date.now()
  const start = Math.max(now, nextSlot)
  nextSlot = start + MIN_GAP_MS
  if (start > now) {
    await sleep(start - now)
  }
}

/**
 * GET a Flock path and parse the JSON body, at most one call per 1.2s.
 * Retries network errors, 429 and 5xx with backoff; other non-2xx and
 * unparseable bodies fail at once.
 */
export async function flockGet<T>(path: string): Promise<T> {
  const url = `${FLOCK_API}${path}`
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await sleep(BACKOFF_MS * 2 ** (attempt - 2))
    }
    await throttle()

    let response: Response
    try {
      response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (error) {
      lastError = new Error(
        `Network error for ${url}: ${error instanceof Error ? error.message : String(error)}`,
      )
      continue
    }

    if (response.ok) {
      try {
        return (await response.json()) as T
      } catch (error) {
        // A malformed body will not fix itself on retry.
        throw new Error(
          `Invalid JSON from ${url}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    lastError = new Error(`HTTP ${response.status} for ${url}`)
    if (response.status !== 429 && response.status < 500) {
      break
    }
  }

  throw lastError
}

/** One entry of GET /players, keyed by Flock player id. */
export interface FlockPlayer {
  player_id: number | string
  player_name?: string | null
  position?: string | null
  team?: string | null
  sleeper_id?: string | number | null
}

export type CreatorMap = Record<string, number | null | undefined>

/** One row of GET /rankings. Only the fields we read are typed. */
export interface FlockRankingRow {
  playerId: number
  playerName?: string | null
  position?: string | null
  team?: string | null
  isDraftPick?: boolean | null
  isSpecialTeams?: boolean | null
  averageRank?: number | null
  initialRank?: number | null
  finalRank?: number | null
  rankDelta?: number | null
  averagePositionalRank?: number | null
  averageTier?: number | null
  averagePositionalTier?: number | null
  averageWeeklyPositionalRank?: number | null
  byeWeek?: number | null
  overallRanks?: CreatorMap | null
  overallTiers?: CreatorMap | null
  positionalRanks?: CreatorMap | null
  positionalTiers?: CreatorMap | null
  weeklyOverallRanks?: CreatorMap | null
  weeklyPositionalRanks?: CreatorMap | null
}

/** GET /rankings response: header fields plus rows. */
export interface FlockRankingsResponse {
  format: string
  subformat?: string | null
  year?: number | null
  lastUpdated?: Record<string, string> | null
  expertEligibleCreators?: string[] | null
  data: FlockRankingRow[]
}
