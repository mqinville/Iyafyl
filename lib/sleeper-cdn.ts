const SLEEPER_CDN = "https://sleepercdn.com"

export function teamLogoUrl(team: string): string {
  return `${SLEEPER_CDN}/images/team_logos/nfl/${team.toLowerCase()}.png`
}

// Team defenses use the team abbreviation as their player id and have a logo,
// not a headshot. Players without a photo get a 403; the client falls back.
export function playerImageUrl(
  playerId: string,
  position: string | null,
): string {
  if (position === "DEF") {
    return teamLogoUrl(playerId)
  }
  return `${SLEEPER_CDN}/content/nfl/players/thumb/${playerId}.jpg`
}
