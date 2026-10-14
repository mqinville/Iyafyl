import { Fragment, type FC, type ReactNode } from "react"
import {
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DEFAULT_SCORING,
  fantasyPoints,
  postWeekLabel,
  snapLabel,
  snapPercent,
  statGroupsFor,
  type StatColumn,
} from "@/lib/player-card"
import {
  FANTASY_POINTS_KEY,
  heatClass,
  SNAP_PERCENT_KEY,
  statHeat,
  type StatHeat,
} from "@/lib/stat-color"
import type { PlayerCard, PlayerGameLog, PlayerScheduleGame } from "@/lib/types"
import { cn } from "@/lib/utils"

const DASH = "–"
const MIN_REGULAR_WEEKS = 18

// Sticky first columns. The table uses border-spacing-[3px]: WK is w-10 (40px)
// plus one 3px gap, so OPP sticks at 43px. The right-hand shadow fills the gap
// with the tray colour so scrolled tiles never show through it.
const stickyShadow = "shadow-[3px_0_0_var(--muted)]"
const stickyWk = cn("sticky left-0 z-10 w-10 min-w-10", stickyShadow)
const stickyOpp = cn("sticky left-[43px] z-10", stickyShadow)

export const Dash: FC = () => {
  return (
    <>
      <span aria-hidden="true">{DASH}</span>
      <span className="sr-only">no data</span>
    </>
  )
}

interface ColumnLabelProps {
  label: string
  title: string
}

export const ColumnLabel: FC<ColumnLabelProps> = ({ label, title }) => {
  return (
    <abbr title={title} className="no-underline">
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{title}</span>
    </abbr>
  )
}

interface Row {
  key: string
  isPost: boolean
  week: string
  opponent: string | null
  isAway: boolean | null
  log: PlayerGameLog | null
  bye: boolean
}

export function formatDecimal(value: number): string {
  return String(Number(value.toFixed(2)))
}

function formatStat(column: StatColumn, log: PlayerGameLog): ReactNode {
  if (log.participation !== "played") {
    return <Dash />
  }
  const value = log.stats?.[column.key]
  if (column.decimals) {
    return value === undefined ? <Dash /> : formatDecimal(value)
  }
  return String(value ?? 0)
}

function buildRows(card: PlayerCard, season: number): Row[] {
  const regular = new Map<number, PlayerGameLog>()
  const post: PlayerGameLog[] = []
  for (const log of card.logs) {
    if (log.season !== season) {
      continue
    }
    if (log.seasonType === "regular") {
      regular.set(log.week, log)
    } else {
      post.push(log)
    }
  }
  const schedule = new Map<number, PlayerScheduleGame>()
  if (card.schedule?.season === season) {
    for (const game of card.schedule.games) {
      if (game.seasonType === "regular") {
        schedule.set(game.week, game)
      }
    }
  }
  const lastScheduledWeek = Math.max(0, ...schedule.keys())
  const maxWeek = Math.max(MIN_REGULAR_WEEKS, ...regular.keys())

  const rows: Row[] = []
  for (let week = 1; week <= maxWeek; week += 1) {
    const log = regular.get(week)
    const game = schedule.get(week)
    if (log) {
      rows.push({
        key: `r${week}`,
        isPost: false,
        week: String(week),
        opponent: log.opponent,
        isAway: log.isAway,
        log,
        bye: log.participation === "bye",
      })
    } else if (game) {
      rows.push({
        key: `r${week}`,
        isPost: false,
        week: String(week),
        opponent: game.opponent,
        isAway: game.isAway,
        log: null,
        bye: false,
      })
    } else if (week < lastScheduledWeek) {
      rows.push({
        key: `r${week}`,
        isPost: false,
        week: String(week),
        opponent: null,
        isAway: null,
        log: null,
        bye: true,
      })
    }
  }
  for (const log of post) {
    rows.push({
      key: `p${log.week}`,
      isPost: true,
      week: postWeekLabel(log.week),
      opponent: log.opponent,
      isAway: log.isAway,
      log,
      bye: log.participation === "bye",
    })
  }
  return rows
}

function opponentLabel(row: Row): ReactNode {
  if (row.bye) {
    return "BYE"
  }
  if (!row.opponent) {
    return <Dash />
  }
  return row.isAway ? `@${row.opponent}` : row.opponent
}

export const numCell = "text-center font-mono tabular-nums"

const tile = "rounded-md"
const statTile = cn(numCell, tile, "min-w-11 px-2 py-1.5")
const rowClass = "border-0 hover:bg-transparent"
const interactiveTile =
  "motion-safe:transition-shadow hover:ring-1 hover:ring-foreground/25 hover:ring-inset"
const focusColumn = "font-semibold ring-1 ring-brand/40 ring-inset"
const focusColumnBase =
  "bg-[color-mix(in_srgb,var(--brand)_12%,var(--card))] text-foreground"

function statTileClass(heat: StatHeat, focus = false): string {
  const tinted = heat.tone === "positive" || heat.tone === "negative"
  return cn(
    statTile,
    interactiveTile,
    focus && focusColumn,
    focus && !tinted ? focusColumnBase : heatClass(heat),
    focus &&
      heat.tone === "muted" &&
      "bg-[color-mix(in_srgb,var(--brand)_5%,var(--card))] text-faint ring-brand/20",
  )
}

interface GameLogTableProps {
  card: PlayerCard
  season: number
}

export const GameLogTable: FC<GameLogTableProps> = ({ card, season }) => {
  const groups = statGroupsFor(card.bio.position)
  const rows = buildRows(card, season)
  const firstPostIndex = rows.findIndex((row) => row.isPost)
  const statColumnCount = groups.reduce((n, g) => n + g.columns.length, 0)
  const columnCount = 4 + statColumnCount

  if (rows.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        No games recorded for {season}.
      </p>
    )
  }

  const playedRegular = rows.filter(
    (row) => !row.isPost && row.log?.participation === "played",
  )
  const fptsTotal = playedRegular.reduce((sum, row) => {
    const points = row.log ? fantasyPoints(row.log, DEFAULT_SCORING) : null
    return sum + (points ?? 0)
  }, 0)
  const totalFor = (column: StatColumn): ReactNode => {
    if (column.total === "none") {
      return <Dash />
    }
    const values = playedRegular.map((row) => row.log?.stats?.[column.key] ?? 0)
    return String(
      column.total === "max"
        ? Math.max(0, ...values)
        : values.reduce((sum, v) => sum + v, 0),
    )
  }

  return (
    // One focusable scroll container (instead of the shadcn Table wrapper's
    // own overflow div) so keyboard users can scroll and WK/OPP can stick.
    <div
      role="region"
      aria-label={`${card.bio.name} game log, ${season}`}
      tabIndex={0}
      className="overflow-x-auto rounded-xl bg-muted py-1 pr-1 ring-1 ring-border focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      <table
        data-slot="table"
        className="w-full caption-bottom border-separate border-spacing-[3px] text-sm"
      >
        <TableCaption className="sr-only">Game log, {season}</TableCaption>
        <TableHeader>
          <TableRow className={rowClass}>
            <TableHead colSpan={2} className={cn(stickyWk, "bg-muted")}>
              <span className="sr-only">Week and opponent</span>
            </TableHead>
            <TableHead
              colSpan={2}
              scope="colgroup"
              className={cn(
                tile,
                "h-7 bg-brand/15 text-center text-[11px] tracking-wider text-foreground",
              )}
            >
              FANTASY
            </TableHead>
            {groups.map((group) => (
              <TableHead
                key={group.label}
                colSpan={group.columns.length}
                scope="colgroup"
                className={cn(
                  tile,
                  "h-7 bg-card text-center text-[11px] tracking-wider text-muted-foreground",
                )}
              >
                {group.label}
              </TableHead>
            ))}
          </TableRow>
          <TableRow className={rowClass}>
            <TableHead
              scope="col"
              className={cn(stickyWk, "bg-muted text-xs text-muted-foreground")}
            >
              WK
            </TableHead>
            <TableHead
              scope="col"
              className={cn(
                stickyOpp,
                "bg-muted text-xs text-muted-foreground",
              )}
            >
              OPP
            </TableHead>
            <TableHead
              scope="col"
              className={cn(
                numCell,
                tile,
                "bg-brand/15 text-xs text-foreground",
              )}
            >
              <ColumnLabel label="FPTS" title="Fantasy points (PPR)" />
            </TableHead>
            <TableHead
              scope="col"
              className={cn(numCell, "text-xs text-muted-foreground")}
            >
              <ColumnLabel label="SNP%" title={snapLabel(card.bio.position)} />
            </TableHead>
            {groups.map((group) =>
              group.columns.map((column) => (
                <TableHead
                  key={`${group.label}-${column.key}`}
                  scope="col"
                  className={cn(numCell, "text-xs text-muted-foreground")}
                >
                  <ColumnLabel label={column.label} title={column.title} />
                </TableHead>
              )),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const { log } = row
            const played = log?.participation === "played"
            const fpts =
              log && played ? fantasyPoints(log, DEFAULT_SCORING) : null
            const snap =
              log && played ? snapPercent(log.stats, card.bio.position) : null
            const label = cn(tile, "bg-card", row.bye && "text-faint")
            return (
              <Fragment key={row.key}>
                {index === firstPostIndex ? (
                  <TableRow className={rowClass}>
                    <TableCell
                      colSpan={columnCount}
                      className={cn(
                        tile,
                        "bg-card py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase",
                      )}
                    >
                      Playoffs
                    </TableCell>
                  </TableRow>
                ) : null}
                <TableRow className={rowClass}>
                  <TableHead
                    scope="row"
                    className={cn(
                      stickyWk,
                      label,
                      "h-auto p-2 text-center font-mono font-normal text-muted-foreground tabular-nums",
                    )}
                  >
                    {row.week}
                  </TableHead>
                  <TableCell
                    className={cn(
                      stickyOpp,
                      label,
                      "font-mono",
                      played ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {opponentLabel(row)}
                  </TableCell>
                  {row.bye ? (
                    <TableCell
                      colSpan={statColumnCount + 2}
                      className={cn(
                        tile,
                        "heat-muted py-1.5 text-center text-xs tracking-wider uppercase",
                      )}
                    >
                      Bye week
                    </TableCell>
                  ) : (
                    <>
                      <TableCell
                        className={statTileClass(
                          statHeat(FANTASY_POINTS_KEY, fpts),
                          true,
                        )}
                      >
                        {fpts !== null ? fpts.toFixed(2) : <Dash />}
                      </TableCell>
                      <TableCell
                        className={statTileClass(
                          statHeat(SNAP_PERCENT_KEY, snap),
                        )}
                      >
                        {snap !== null ? String(Math.round(snap)) : <Dash />}
                      </TableCell>
                      {groups.map((group) =>
                        group.columns.map((column) => (
                          <TableCell
                            key={`${group.label}-${column.key}`}
                            className={statTileClass(
                              statHeat(
                                column.key,
                                played ? (log?.stats?.[column.key] ?? 0) : null,
                              ),
                            )}
                          >
                            {log ? formatStat(column, log) : <Dash />}
                          </TableCell>
                        )),
                      )}
                    </>
                  )}
                </TableRow>
              </Fragment>
            )
          })}
          <TableRow className={cn(rowClass, "font-semibold")}>
            <TableHead
              scope="row"
              colSpan={2}
              className={cn(
                stickyWk,
                tile,
                "h-auto bg-primary p-2 text-center font-semibold text-primary-foreground",
              )}
            >
              Total
            </TableHead>
            <TableCell className={cn(statTile, focusColumn, focusColumnBase)}>
              {fptsTotal.toFixed(2)}
            </TableCell>
            <TableCell className={cn(statTile, "heat-muted")}>
              <Dash />
            </TableCell>
            {groups.map((group) =>
              group.columns.map((column) => (
                <TableCell
                  key={`${group.label}-${column.key}`}
                  className={cn(
                    statTile,
                    "bg-card text-foreground ring-1 ring-border ring-inset",
                  )}
                >
                  {totalFor(column)}
                </TableCell>
              )),
            )}
          </TableRow>
        </TableBody>
      </table>
    </div>
  )
}
