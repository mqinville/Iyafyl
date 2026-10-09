import type { LeagueTitles, StandingRow, WeeklyStory } from "@/lib/types"

export const leagueTitles: LeagueTitles = {
  guru: {
    manager: "Dre",
    team: "Lamb Chops",
    note: "defending champion",
  },
  kingShit: {
    manager: "Connor",
    punishment: "Next one works a full shift at Waffle House.",
  },
}

export const weeklyStory: WeeklyStory = {
  week: 6,
  season: 2026,
  headline: "Felix stays perfect. Connor is still looking for a win.",
  deck: "The 5–0 team plays the 0–5 team on Sunday.",
}

const placeholderRows: [string, string, number, number, number][] = [
  ["Bijan Mustard", "Felix", 5, 0, 712.4],
  ["Lamb Chops", "Dre", 4, 1, 688.1],
  ["Kittle Me This", "Marcus", 4, 1, 655.0],
  ["Hurts Donut", "Josh", 3, 2, 641.7],
  ["Chase Bank", "Tyler", 3, 2, 630.2],
  ["Puka Shells", "Nico", 3, 2, 618.9],
  ["Bowers of Power", "Sam", 2, 3, 602.3],
  ["Gibbs Me a Break", "Ryan", 2, 3, 597.5],
  ["Breece Lightning", "Owen", 2, 3, 581.0],
  ["Nacua Matata", "Ethan", 1, 4, 560.4],
  ["Waddle Waddle", "Liam", 1, 4, 548.8],
  ["Tua Legit", "Connor", 0, 5, 501.2],
]

export const placeholderStandings: StandingRow[] = placeholderRows.map(
  ([teamName, manager, wins, losses, pointsFor], i) => ({
    rosterId: i + 1,
    rank: i + 1,
    teamName,
    manager,
    wins,
    losses,
    ties: 0,
    pointsFor,
  }),
)
