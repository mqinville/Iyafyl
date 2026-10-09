// Sleeper league ids are numeric. An empty value clears a saved id.
export const LEAGUE_ID_PATTERN = /^[0-9]{1,20}$/

export type ParsedLeagueId =
  { ok: true; leagueId: string | null } | { ok: false }

export function parseLeagueId(value: string): ParsedLeagueId {
  const trimmed = value.trim()
  if (!trimmed) {
    return { ok: true, leagueId: null }
  }
  if (!LEAGUE_ID_PATTERN.test(trimmed)) {
    return { ok: false }
  }
  return { ok: true, leagueId: trimmed }
}
