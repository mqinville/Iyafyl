import {
  DEFAULT_SCORING,
  type ScoringFormat,
  type StatGroup,
} from "@/lib/player-card"
import type { SeasonType } from "@/lib/types"

export const MAIN_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"] as const
export type MainPosition = (typeof MAIN_POSITIONS)[number]
export type PositionFilter = "ALL" | MainPosition | "MORE"
export const POSITION_FILTERS: readonly PositionFilter[] = [
  "ALL",
  ...MAIN_POSITIONS,
  "MORE",
]

export const RANKINGS_PAGE_SIZE = 50
export const MIN_SEASON = 2009
// Tracks the latest ingested season; bump it when a new season is ingested.
export const LATEST_SEASON = 2026
const MAX_PAGE = 1000
const MAX_SEARCH_LENGTH = 50

export type RankingStatKey =
  | "gp"
  | "pts_ppr"
  | "pts_half_ppr"
  | "pts_std"
  | "rush_att"
  | "rush_yd"
  | "rush_td"
  | "rec"
  | "rec_tgt"
  | "rec_yd"
  | "rec_td"
  | "pass_cmp"
  | "pass_att"
  | "pass_yd"
  | "pass_td"
  | "pass_int"
  | "fgm"
  | "fga"
  | "xpm"
  | "xpa"
  | "sack"
  | "def_int"
  | "fum_rec"
  | "def_td"
  | "pts_allow"
  | "flock_rank"
  | "flock_pos_rank"
  | "flock_tier"

// Every key the player_rankings RPC accepts as p_sort.
export type RankingSortKey = RankingStatKey | "full_name"

const STAT_KEYS: readonly RankingStatKey[] = [
  "gp",
  "pts_ppr",
  "pts_half_ppr",
  "pts_std",
  "rush_att",
  "rush_yd",
  "rush_td",
  "rec",
  "rec_tgt",
  "rec_yd",
  "rec_td",
  "pass_cmp",
  "pass_att",
  "pass_yd",
  "pass_td",
  "pass_int",
  "fgm",
  "fga",
  "xpm",
  "xpa",
  "sack",
  "def_int",
  "fum_rec",
  "def_td",
  "pts_allow",
  "flock_rank",
  "flock_pos_rank",
  "flock_tier",
]
export const RANKING_STAT_KEYS = STAT_KEYS
const SORT_KEYS: readonly string[] = [...STAT_KEYS, "full_name"]

export type SortDirection = "asc" | "desc"
export type PlayerStatus = "active" | "inactive"

// Mirrors FLOCK_LISTS in data/flock/script/flock-api.ts and the list check
// constraint plus the player_rankings validation in
// supabase/migrations/20261011120000_flock_rankings.sql.
export type FlockList = "REDRAFT" | "REDRAFT_SF"
export const FLOCK_LISTS: readonly { value: FlockList; label: string }[] = [
  { value: "REDRAFT", label: "Redraft 1QB" },
  { value: "REDRAFT_SF", label: "Redraft SF" },
]
const DEFAULT_FLOCK_LIST: FlockList = "REDRAFT"
const MAX_CREATOR_LENGTH = 60

// Rank-like columns read best with 1 first; everything else leads with the
// biggest value.
const ASCENDING_SORT_KEYS: ReadonlySet<RankingSortKey> = new Set([
  "full_name",
  "flock_rank",
  "flock_pos_rank",
  "flock_tier",
])

export function defaultDirFor(sort: RankingSortKey): SortDirection {
  return ASCENDING_SORT_KEYS.has(sort) ? "asc" : "desc"
}

export interface RankingsParams {
  position: PositionFilter
  search: string
  season: number
  week: number | null
  seasonType: SeasonType
  status: PlayerStatus
  scoring: ScoringFormat
  sort: RankingSortKey
  dir: SortDirection
  flockList: FlockList
  // null = consensus; otherwise a creator display name.
  flockCreator: string | null
  rankedOnly: boolean
  // 1-based.
  page: number
}

const SCORINGS: readonly ScoringFormat[] = ["ppr", "half_ppr", "std"]

export function pointsKey(scoring: ScoringFormat): RankingStatKey {
  if (scoring === "std") {
    return "pts_std"
  }
  return scoring === "half_ppr" ? "pts_half_ppr" : "pts_ppr"
}

function isPointsKey(key: string): boolean {
  return key === "pts_ppr" || key === "pts_half_ppr" || key === "pts_std"
}

export function maxWeek(seasonType: SeasonType): number {
  return seasonType === "post" ? 4 : 18
}

type RawParams = Record<string, string | string[] | undefined>

function first(raw: RawParams, key: string): string | undefined {
  const value = raw[key]
  return Array.isArray(value) ? value[0] : value
}

function toInt(value: string | undefined): number | null {
  if (value === undefined || !/^\d{1,6}$/.test(value)) {
    return null
  }
  return Number(value)
}

export function parseRankingsParams(raw: RawParams): RankingsParams {
  const positionRaw = first(raw, "position")?.toUpperCase()
  const position =
    POSITION_FILTERS.find((p) => p === positionRaw) ?? ("ALL" as const)

  const seasonRaw = toInt(first(raw, "season"))
  const season =
    seasonRaw !== null && seasonRaw >= MIN_SEASON && seasonRaw <= LATEST_SEASON
      ? seasonRaw
      : LATEST_SEASON

  const seasonType: SeasonType =
    first(raw, "type") === "post" ? "post" : "regular"

  const weekRaw = toInt(first(raw, "week"))
  const week =
    weekRaw !== null && weekRaw >= 1 && weekRaw <= maxWeek(seasonType)
      ? weekRaw
      : null

  const scoringRaw = first(raw, "scoring")
  const scoring = SCORINGS.find((s) => s === scoringRaw) ?? DEFAULT_SCORING

  const sortRaw = first(raw, "sort")
  const sort = SORT_KEYS.includes(sortRaw ?? "")
    ? (sortRaw as RankingSortKey)
    : pointsKey(scoring)
  // Follow the chosen scoring format when sorting by points.
  const resolvedSort = isPointsKey(sort) ? pointsKey(scoring) : sort

  const dirRaw = first(raw, "dir")
  const dir: SortDirection =
    dirRaw === "asc" || dirRaw === "desc" ? dirRaw : defaultDirFor(resolvedSort)

  const flockList =
    FLOCK_LISTS.find((l) => l.value === first(raw, "flock"))?.value ??
    DEFAULT_FLOCK_LIST
  const creatorRaw = (first(raw, "creator") ?? "")
    .trim()
    .slice(0, MAX_CREATOR_LENGTH)

  const pageRaw = toInt(first(raw, "page"))
  const page =
    pageRaw !== null && pageRaw >= 1 ? Math.min(pageRaw, MAX_PAGE) : 1

  return {
    position,
    search: (first(raw, "q") ?? "").trim().slice(0, MAX_SEARCH_LENGTH),
    season,
    week,
    seasonType,
    status: first(raw, "status") === "inactive" ? "inactive" : "active",
    scoring,
    sort: resolvedSort,
    dir,
    flockList,
    flockCreator: creatorRaw === "" ? null : creatorRaw,
    rankedOnly: first(raw, "ranked") === "1",
    page,
  }
}

// Builds a /rankings URL from current params plus a patch, leaving out values
// equal to the defaults. Changing anything except the page resets to page 1.
export function rankingsHref(
  params: RankingsParams,
  patch: Partial<RankingsParams>,
): string {
  const next: RankingsParams = { ...params, ...patch }
  const filterChanged = (Object.keys(patch) as (keyof RankingsParams)[]).some(
    (key) => key !== "page",
  )
  if (filterChanged && patch.page === undefined) {
    next.page = 1
  }
  if (patch.scoring && isPointsKey(next.sort)) {
    next.sort = pointsKey(next.scoring)
  }
  if (patch.sort !== undefined && patch.dir === undefined) {
    next.dir = defaultDirFor(next.sort)
  }
  if (patch.seasonType && patch.week === undefined) {
    next.week = null
  }

  const query = new URLSearchParams()
  if (next.position !== "ALL") {
    query.set("position", next.position)
  }
  if (next.search !== "") {
    query.set("q", next.search)
  }
  if (next.season !== LATEST_SEASON) {
    query.set("season", String(next.season))
  }
  if (next.seasonType !== "regular") {
    query.set("type", next.seasonType)
  }
  if (next.week !== null) {
    query.set("week", String(next.week))
  }
  if (next.status !== "active") {
    query.set("status", next.status)
  }
  if (next.scoring !== DEFAULT_SCORING) {
    query.set("scoring", next.scoring)
  }
  if (next.sort !== pointsKey(next.scoring)) {
    query.set("sort", next.sort)
  }
  if (next.dir !== defaultDirFor(next.sort)) {
    query.set("dir", next.dir)
  }
  if (next.flockList !== DEFAULT_FLOCK_LIST) {
    query.set("flock", next.flockList)
  }
  if (next.flockCreator !== null) {
    query.set("creator", next.flockCreator)
  }
  if (next.rankedOnly) {
    query.set("ranked", "1")
  }
  if (next.page > 1) {
    query.set("page", String(next.page))
  }
  const qs = query.toString()
  return qs === "" ? "/rankings" : `/rankings?${qs}`
}

function fantasyGroup(scoring: ScoringFormat): StatGroup {
  return {
    label: "FANTASY",
    columns: [
      { key: pointsKey(scoring), label: "PTS", title: "Fantasy points" },
    ],
  }
}

const FLOCK_GROUP: StatGroup = {
  label: "FLOCK",
  columns: [
    { key: "flock_rank", label: "RANK", title: "Flock rank" },
    {
      key: "flock_pos_rank",
      label: "POS RK",
      title: "Flock positional rank",
    },
    { key: "flock_tier", label: "TIER", title: "Flock tier" },
  ],
}

const OFFENSE_GROUPS: StatGroup[] = [
  {
    label: "RUSHING",
    columns: [
      { key: "rush_att", label: "ATT", title: "Rushing attempts" },
      { key: "rush_yd", label: "YD", title: "Rushing yards" },
      { key: "rush_td", label: "TD", title: "Rushing touchdowns" },
    ],
  },
  {
    label: "RECEIVING",
    columns: [
      { key: "rec", label: "REC", title: "Receptions" },
      { key: "rec_tgt", label: "TAR", title: "Targets" },
      { key: "rec_yd", label: "YD", title: "Receiving yards" },
      { key: "rec_td", label: "TD", title: "Receiving touchdowns" },
    ],
  },
  {
    label: "PASSING",
    columns: [
      { key: "pass_cmp", label: "CMP", title: "Completions" },
      { key: "pass_att", label: "ATT", title: "Pass attempts" },
      { key: "pass_yd", label: "YD", title: "Passing yards" },
      { key: "pass_td", label: "TD", title: "Passing touchdowns" },
    ],
  },
]

const KICKING_GROUP: StatGroup = {
  label: "KICKING",
  columns: [
    { key: "fgm", label: "FGM", title: "Field goals made" },
    { key: "fga", label: "FGA", title: "Field goals attempted" },
    { key: "xpm", label: "XPM", title: "Extra points made" },
    { key: "xpa", label: "XPA", title: "Extra points attempted" },
  ],
}

const DEFENSE_GROUP: StatGroup = {
  label: "DEFENSE",
  columns: [
    { key: "sack", label: "SACK", title: "Sacks" },
    { key: "def_int", label: "INT", title: "Interceptions" },
    { key: "fum_rec", label: "FR", title: "Fumble recoveries" },
    { key: "def_td", label: "TD", title: "Defensive touchdowns" },
    { key: "pts_allow", label: "PA", title: "Points allowed" },
  ],
}

export function rankingsColumnsFor(
  position: PositionFilter,
  scoring: ScoringFormat,
): StatGroup[] {
  const fantasy = fantasyGroup(scoring)
  if (position === "K") {
    return [fantasy, FLOCK_GROUP, KICKING_GROUP]
  }
  if (position === "DEF") {
    return [fantasy, FLOCK_GROUP, DEFENSE_GROUP]
  }
  return [fantasy, FLOCK_GROUP, ...OFFENSE_GROUPS]
}

// "Kyler Murray" -> "K. Murray". Team defenses keep their full name.
export function abbreviateName(
  fullName: string | null,
  firstName?: string | null,
  lastName?: string | null,
  position?: string | null,
): string {
  const full = (fullName ?? "").trim()
  if (position === "DEF") {
    return full
  }
  const first = (firstName ?? "").trim()
  const last = (lastName ?? "").trim()
  if (first !== "" && last !== "") {
    return `${first[0]}. ${last}`
  }
  const parts = full.split(/\s+/)
  if (parts.length < 2) {
    return full
  }
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`
}
