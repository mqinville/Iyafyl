// Maps a stat value to a heat level so tables can tint cells by how good (or
// bad) the number is. Pure and framework-free: reuse it for the trade
// calculator or any other stat grid. The classes it returns are defined in
// app/globals.css (`heat-*`) from the --heat-pos / --heat-neg tokens.

export type HeatLevel = 0 | 1 | 2 | 3 | 4

// "muted": zero, empty or missing. "neutral": a value with no tint (below the
// first threshold or an untracked stat). "positive": green-olive tint scaled by
// level. "negative": red tint scaled by level.
export type HeatTone = "muted" | "neutral" | "positive" | "negative"

export interface StatHeat {
  tone: HeatTone
  level: HeatLevel
}

// Lower bounds for levels 1-4: the level is how many thresholds the value
// meets. `good` stats tint olive; `bad` stats tint red; `lowIsGood` stats (such
// as points allowed) count thresholds the value is at or under.
type ScaleKind = "good" | "bad" | "lowIsGood"

interface StatScale {
  kind: ScaleKind
  thresholds: readonly [number, number, number, number]
}

export const FANTASY_POINTS_KEY = "pts"
export const SNAP_PERCENT_KEY = "snap_pct"

const good = (...thresholds: [number, number, number, number]): StatScale => ({
  kind: "good",
  thresholds,
})

const bad = (...thresholds: [number, number, number, number]): StatScale => ({
  kind: "bad",
  thresholds,
})

const lowIsGood = (
  ...thresholds: [number, number, number, number]
): StatScale => ({ kind: "lowIsGood", thresholds })

const COUNT_TD = good(1, 2, 3, 4)

// Keys match the Sleeper stat keys used in lib/player-card.ts, plus the two
// derived Fantasy columns above.
const SCALES: Readonly<Record<string, StatScale>> = {
  [FANTASY_POINTS_KEY]: good(8, 14, 20, 28),
  [SNAP_PERCENT_KEY]: good(25, 50, 75, 90),

  pass_att: good(15, 25, 32, 40),
  pass_cmp: good(10, 18, 24, 30),
  pass_yd: good(100, 200, 275, 350),
  pass_td: COUNT_TD,

  rush_att: good(4, 10, 16, 22),
  rush_yd: good(20, 50, 90, 130),
  rush_ypa: good(3, 4.5, 6, 8),
  rush_td: COUNT_TD,

  rec_tgt: good(3, 6, 9, 12),
  rec: good(2, 5, 8, 11),
  rec_yd: good(20, 50, 90, 130),
  rec_ypr: good(6, 10, 14, 20),
  rec_td: COUNT_TD,

  fgm: good(1, 2, 3, 4),
  fgm_lng: good(30, 40, 50, 55),
  xpm: good(1, 2, 3, 5),

  sack: good(1, 2, 3, 5),
  int: good(1, 2, 3, 4),
  fum_rec: good(1, 2, 3, 4),
  ff: good(1, 2, 3, 4),
  def_td: good(1, 1, 2, 3),
  pts_allow: lowIsGood(20, 14, 10, 6),
  yds_allow: lowIsGood(400, 325, 275, 225),

  // Offensive turnovers and negative plays: any non-zero value tints red, and
  // repeats deepen the tint.
  pass_int: bad(1, 1, 2, 3),
  pass_sack: bad(1, 2, 3, 5),
  pass_sack_yds: bad(1, 8, 15, 25),
  fum: bad(1, 1, 2, 3),
  fum_lost: bad(1, 1, 1, 2),
}

const MUTED: StatHeat = { tone: "muted", level: 0 }
const NEUTRAL: StatHeat = { tone: "neutral", level: 0 }

function countMet(
  thresholds: readonly number[],
  met: (threshold: number) => boolean,
): HeatLevel {
  return thresholds.filter(met).length as HeatLevel
}

export function statHeat(
  key: string,
  value: number | null | undefined,
): StatHeat {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return MUTED
  }
  const scale = SCALES[key]
  if (!scale) {
    return value === 0 ? MUTED : NEUTRAL
  }
  switch (scale.kind) {
    case "good": {
      if (value === 0) {
        return MUTED
      }
      if (value < 0) {
        return { tone: "negative", level: 2 }
      }
      const level = countMet(scale.thresholds, (t) => value >= t)
      return level === 0
        ? NEUTRAL
        : { tone: "positive", level: level as HeatLevel }
    }
    case "bad": {
      if (value === 0) {
        return MUTED
      }
      const level = countMet(scale.thresholds, (t) => value >= t)
      return { tone: "negative", level: Math.max(1, level) as HeatLevel }
    }
    case "lowIsGood": {
      const level = countMet(scale.thresholds, (t) => value <= t)
      return level === 0
        ? NEUTRAL
        : { tone: "positive", level: level as HeatLevel }
    }
    default: {
      const unreachable: never = scale.kind
      return unreachable
    }
  }
}

const POSITIVE_CLASSES = [
  "text-foreground",
  "heat-pos-1",
  "heat-pos-2",
  "heat-pos-3",
  "heat-pos-4",
] as const

const NEGATIVE_CLASSES = [
  "text-foreground",
  "heat-neg-1",
  "heat-neg-2",
  "heat-neg-3",
  "heat-neg-4",
] as const

export function heatClass(heat: StatHeat): string {
  switch (heat.tone) {
    case "muted":
      return "heat-muted"
    case "neutral":
      return "text-foreground"
    case "positive":
      return POSITIVE_CLASSES[heat.level]
    case "negative":
      return NEGATIVE_CLASSES[heat.level]
    default: {
      const unreachable: never = heat.tone
      return unreachable
    }
  }
}

export function statHeatClass(
  key: string,
  value: number | null | undefined,
): string {
  return heatClass(statHeat(key, value))
}
