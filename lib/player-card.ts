import type { PlayerGameLog } from "@/lib/types"

export type ScoringFormat = "ppr" | "half_ppr" | "std"

export interface StatColumn {
  key: string
  label: string
  // Full name for tooltips and aria labels.
  title: string
  // Shown with up to two decimals (averages), not as a whole number.
  decimals?: boolean
  // How the Total row combines weekly values; default "sum".
  total?: "sum" | "max" | "none"
}

export interface StatGroup {
  label: string
  columns: StatColumn[]
}

export const DEFAULT_SCORING: ScoringFormat = "ppr"

const RUSH_ATT: StatColumn = {
  key: "rush_att",
  label: "ATT",
  title: "Rushing attempts",
}
const RUSH_YD: StatColumn = {
  key: "rush_yd",
  label: "YD",
  title: "Rushing yards",
}
const RUSH_YPC: StatColumn = {
  key: "rush_ypa",
  label: "YPC",
  title: "Yards per carry",
  decimals: true,
  total: "none",
}
const RUSH_TD: StatColumn = {
  key: "rush_td",
  label: "TD",
  title: "Rushing touchdowns",
}
const REC_TGT: StatColumn = {
  key: "rec_tgt",
  label: "TGT",
  title: "Targets",
}
const REC_REC: StatColumn = {
  key: "rec",
  label: "REC",
  title: "Receptions",
}
const REC_YD: StatColumn = {
  key: "rec_yd",
  label: "YD",
  title: "Receiving yards",
}
const REC_YPR: StatColumn = {
  key: "rec_ypr",
  label: "YPR",
  title: "Yards per reception",
  decimals: true,
  total: "none",
}
const REC_TD: StatColumn = {
  key: "rec_td",
  label: "TD",
  title: "Receiving touchdowns",
}

const FUMBLE: StatGroup = {
  label: "FUMBLE",
  columns: [
    { key: "fum", label: "FUM", title: "Fumbles" },
    { key: "fum_lost", label: "LOST", title: "Fumbles lost" },
  ],
}

const RUSHING: StatGroup = {
  label: "RUSHING",
  columns: [RUSH_ATT, RUSH_YD, RUSH_YPC, RUSH_TD],
}

const RECEIVING: StatGroup = {
  label: "RECEIVING",
  columns: [REC_TGT, REC_REC, REC_YD, REC_TD],
}

const QB_GROUPS: StatGroup[] = [
  {
    label: "PASS",
    columns: [
      { key: "pass_att", label: "ATT", title: "Pass attempts" },
      { key: "pass_cmp", label: "CMP", title: "Completions" },
      { key: "pass_yd", label: "YD", title: "Passing yards" },
      { key: "pass_td", label: "TD", title: "Passing touchdowns" },
      { key: "pass_int", label: "INT", title: "Interceptions thrown" },
    ],
  },
  RUSHING,
  {
    label: "SACKED",
    columns: [
      { key: "pass_sack", label: "SK", title: "Times sacked" },
      { key: "pass_sack_yds", label: "YDS", title: "Sack yards lost" },
    ],
  },
  FUMBLE,
]

const RB_GROUPS: StatGroup[] = [RUSHING, RECEIVING, FUMBLE]

const RECEIVER_GROUPS: StatGroup[] = [
  { label: "RECEIVING", columns: [REC_TGT, REC_REC, REC_YD, REC_YPR, REC_TD] },
  { label: "RUSHING", columns: [RUSH_ATT, RUSH_YD, RUSH_TD] },
  FUMBLE,
]

const K_GROUPS: StatGroup[] = [
  {
    label: "FIELD GOALS",
    columns: [
      { key: "fgm", label: "FGM", title: "Field goals made" },
      { key: "fga", label: "FGA", title: "Field goals attempted" },
      {
        key: "fgm_lng",
        label: "LNG",
        title: "Longest field goal made",
        total: "max",
      },
    ],
  },
  {
    label: "EXTRA PTS",
    columns: [
      { key: "xpm", label: "XPM", title: "Extra points made" },
      { key: "xpa", label: "XPA", title: "Extra points attempted" },
    ],
  },
]

const DEF_GROUPS: StatGroup[] = [
  {
    label: "DEFENSE",
    columns: [
      { key: "sack", label: "SACK", title: "Sacks" },
      { key: "int", label: "INT", title: "Interceptions" },
      { key: "fum_rec", label: "FR", title: "Fumble recoveries" },
      { key: "ff", label: "FF", title: "Forced fumbles" },
      { key: "def_td", label: "TD", title: "Defensive touchdowns" },
    ],
  },
  {
    label: "ALLOWED",
    columns: [
      { key: "pts_allow", label: "PTS", title: "Points allowed" },
      { key: "yds_allow", label: "YDS", title: "Yards allowed" },
    ],
  },
]

const FALLBACK_GROUPS: StatGroup[] = [RUSHING, RECEIVING, FUMBLE]

// The FANTASY group (FPTS + SNP%) is rendered separately by the UI.
export function statGroupsFor(position: string | null): StatGroup[] {
  switch (position) {
    case "QB":
      return QB_GROUPS
    case "RB":
      return RB_GROUPS
    case "WR":
    case "TE":
      return RECEIVER_GROUPS
    case "K":
      return K_GROUPS
    case "DEF":
      return DEF_GROUPS
    default:
      return FALLBACK_GROUPS
  }
}

// Kickers play special-teams snaps; team defenses have no snap counts.
export function snapLabel(position: string | null): string {
  if (position === "DEF") {
    return "Snap share (not tracked for team defenses)"
  }
  return position === "K" ? "Special teams snap share" : "Offensive snap share"
}

export function snapPercent(
  stats: Record<string, number> | null,
  position: string | null,
): number | null {
  if (!stats || position === "DEF") {
    return null
  }
  const [player, team] =
    position === "K"
      ? [stats.st_snp, stats.tm_st_snp]
      : [stats.off_snp, stats.tm_off_snp]
  if (!team) {
    return null
  }
  return ((player ?? 0) / team) * 100
}

export function fantasyPoints(
  log: PlayerGameLog,
  scoring: ScoringFormat,
): number | null {
  switch (scoring) {
    case "ppr":
      return log.ptsPpr
    case "half_ppr":
      return log.ptsHalfPpr
    case "std":
      return log.ptsStd
  }
}

export function formatHeight(inches: number | null): string | null {
  if (inches === null || !Number.isFinite(inches) || inches <= 0) {
    return null
  }
  const total = Math.round(inches)
  return `${Math.floor(total / 12)}'${total % 12}"`
}

export function ageFrom(
  birthDate: string | null,
  today: Date = new Date(),
): number | null {
  if (!birthDate) {
    return null
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate)
  if (!match) {
    return null
  }
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ]
  let age = today.getFullYear() - year
  const monthDiff = today.getMonth() + 1 - month
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age -= 1
  }
  return age >= 0 ? age : null
}

export function postWeekLabel(week: number): string {
  switch (week) {
    case 1:
      return "WC"
    case 2:
      return "DIV"
    case 3:
      return "CONF"
    case 4:
      return "SB"
    default:
      return `P${week}`
  }
}
