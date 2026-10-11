import { fetchJson, SLEEPER_STATS_API } from "@/data/shared/sleeper"

import type { SeasonType } from "./schedule"
import type { SleeperStatsRow } from "./sleeper-types"

/**
 * One week of per-player stat rows.
 *
 * WARNING: /stats/nfl is an unofficial, undocumented Sleeper endpoint and may
 * change or break without notice. Sleeper answers `{}` (an object) instead of
 * `[]` for weeks without data.
 */
export async function fetchStatsWeek(
  season: number,
  seasonType: SeasonType,
  week: number,
): Promise<SleeperStatsRow[]> {
  const body = await fetchJson<SleeperStatsRow[] | Record<string, never>>(
    `${SLEEPER_STATS_API}/stats/nfl/${season}/${week}?season_type=${seasonType}`,
  )
  return Array.isArray(body) ? body : []
}
