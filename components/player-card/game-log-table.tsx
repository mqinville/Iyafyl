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
import type { PlayerCard, PlayerGameLog, PlayerScheduleGame } from "@/lib/types"
import { cn } from "@/lib/utils"

const DASH = "–"
const MIN_REGULAR_WEEKS = 18

// Sticky first columns: WK is w-12, so OPP sticks at that offset.
const stickyWk = "sticky left-0 z-10 w-12 min-w-12 bg-card"
const stickyOpp = "sticky left-12 z-10 bg-card"

const Dash: FC = () => {
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

const ColumnLabel: FC<ColumnLabelProps> = ({ label, title }) => {
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

function formatDecimal(value: number): string {
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

const numCell = "text-center font-mono tabular-nums"

interface GameLogTableProps {
  card: PlayerCard
  season: number
}

export const GameLogTable: FC<GameLogTableProps> = ({ card, season }) => {
  const groups = statGroupsFor(card.bio.position)
  const rows = buildRows(card, season)
  const firstPostIndex = rows.findIndex((row) => row.isPost)
  const columnCount = 4 + groups.reduce((n, g) => n + g.columns.length, 0)

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
      className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      <table data-slot="table" className="w-full caption-bottom text-sm">
        <TableCaption className="sr-only">Game log, {season}</TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead colSpan={2} className={stickyWk}>
              <span className="sr-only">Week and opponent</span>
            </TableHead>
            <TableHead
              colSpan={2}
              scope="colgroup"
              className="border-l border-border bg-muted text-center text-[11px] tracking-wider text-muted-foreground"
            >
              FANTASY
            </TableHead>
            {groups.map((group) => (
              <TableHead
                key={group.label}
                colSpan={group.columns.length}
                scope="colgroup"
                className="border-l border-border text-center text-[11px] tracking-wider text-muted-foreground"
              >
                {group.label}
              </TableHead>
            ))}
          </TableRow>
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className={stickyWk}>
              WK
            </TableHead>
            <TableHead scope="col" className={stickyOpp}>
              OPP
            </TableHead>
            <TableHead
              scope="col"
              className={cn("border-l border-border bg-muted", numCell)}
            >
              <ColumnLabel label="FPTS" title="Fantasy points (PPR)" />
            </TableHead>
            <TableHead scope="col" className={cn("bg-muted", numCell)}>
              <ColumnLabel label="SNP%" title={snapLabel(card.bio.position)} />
            </TableHead>
            {groups.map((group) =>
              group.columns.map((column, index) => (
                <TableHead
                  key={`${group.label}-${column.key}`}
                  scope="col"
                  className={cn(
                    numCell,
                    index === 0 && "border-l border-border",
                  )}
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
            return (
              <Fragment key={row.key}>
                {index === firstPostIndex ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={columnCount}
                      className="bg-muted/50 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                    >
                      Playoffs
                    </TableCell>
                  </TableRow>
                ) : null}
                <TableRow>
                  <TableHead
                    scope="row"
                    className={cn(
                      stickyWk,
                      "h-auto p-2 font-mono font-normal text-muted-foreground tabular-nums",
                    )}
                  >
                    {row.week}
                  </TableHead>
                  <TableCell
                    className={cn(
                      stickyOpp,
                      "font-mono",
                      played ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {opponentLabel(row)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      numCell,
                      "border-l border-border bg-muted font-semibold",
                    )}
                  >
                    {fpts !== null ? fpts.toFixed(2) : <Dash />}
                  </TableCell>
                  <TableCell className={cn(numCell, "bg-muted")}>
                    {snap !== null ? String(Math.round(snap)) : <Dash />}
                  </TableCell>
                  {groups.map((group) =>
                    group.columns.map((column, i) => (
                      <TableCell
                        key={`${group.label}-${column.key}`}
                        className={cn(
                          numCell,
                          i === 0 && "border-l border-border",
                        )}
                      >
                        {log ? formatStat(column, log) : <Dash />}
                      </TableCell>
                    )),
                  )}
                </TableRow>
              </Fragment>
            )
          })}
          <TableRow className="border-t-2 border-border font-semibold hover:bg-transparent">
            <TableHead
              scope="row"
              colSpan={2}
              className={cn(stickyWk, "h-auto p-2 font-semibold")}
            >
              Total
            </TableHead>
            <TableCell
              className={cn(numCell, "border-l border-border bg-muted")}
            >
              {fptsTotal.toFixed(2)}
            </TableCell>
            <TableCell className={cn(numCell, "bg-muted")}>
              <Dash />
            </TableCell>
            {groups.map((group) =>
              group.columns.map((column, i) => (
                <TableCell
                  key={`${group.label}-${column.key}`}
                  className={cn(numCell, i === 0 && "border-l border-border")}
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
