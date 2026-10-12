import type { FC, ReactNode } from "react"
import {
  ColumnLabel,
  Dash,
  formatDecimal,
  numCell,
} from "@/components/player-card/game-log-table"
import { SortLink } from "@/components/rankings/sort-link"
import { PlayerNameButton } from "@/components/rankings/player-name-button"
import {
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  defaultDirFor,
  pointsKey,
  rankingsColumnsFor,
  RANKINGS_PAGE_SIZE,
  type RankingSortKey,
  type RankingsParams,
} from "@/lib/rankings"
import type { RankingRow } from "@/lib/server/rankings"
import { cn } from "@/lib/utils"

// The right-edge shadow shows that the stat columns scroll beneath.
const stickyPlayer =
  "sticky left-0 z-10 w-40 min-w-40 bg-card shadow-[1px_0_0_var(--border),6px_0_8px_-6px_rgb(0_0_0/0.18)] sm:w-64 sm:min-w-64"

interface RankingsTableProps {
  params: RankingsParams
  rows: RankingRow[]
}

function ariaSort(
  params: RankingsParams,
  key: RankingSortKey,
): "ascending" | "descending" | "none" {
  if (params.sort !== key) {
    return "none"
  }
  return params.dir === "asc" ? "ascending" : "descending"
}

function formatStat(value: number | null): ReactNode {
  return value === null ? <Dash /> : formatDecimal(value)
}

export const RankingsTable: FC<RankingsTableProps> = ({ params, rows }) => {
  const groups = rankingsColumnsFor(params.position, params.scoring)
  const points = pointsKey(params.scoring)
  const offset = (params.page - 1) * RANKINGS_PAGE_SIZE
  const singleWeek = params.week !== null

  return (
    <div
      role="region"
      aria-label="Player rankings"
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-border bg-card focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      <table data-slot="table" className="w-full caption-bottom text-sm">
        <TableCaption className="sr-only">
          Player rankings, {params.season}
          {singleWeek ? `, week ${params.week}` : ""}
        </TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={stickyPlayer}>
              <span className="sr-only">Player</span>
            </TableHead>
            <TableHead className="border-l border-border" />
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
            <TableHead
              scope="col"
              aria-sort={ariaSort(params, "full_name")}
              className={stickyPlayer}
            >
              <div className="flex items-center gap-2.5">
                <span
                  title="Row number"
                  className="w-6 shrink-0 text-right font-mono text-xs font-normal text-muted-foreground"
                >
                  <span aria-hidden="true">#</span>
                  <span className="sr-only">Row</span>
                </span>
                <SortLink
                  params={params}
                  sortKey="full_name"
                  firstDir="asc"
                  label="Player"
                >
                  PLAYER
                </SortLink>
              </div>
            </TableHead>
            <TableHead
              scope="col"
              aria-sort={ariaSort(params, "gp")}
              className={cn("border-l border-border", numCell)}
            >
              <SortLink
                params={params}
                sortKey="gp"
                firstDir="desc"
                label="Games played"
              >
                <ColumnLabel label="GP" title="Games played" />
              </SortLink>
            </TableHead>
            {groups.map((group) =>
              group.columns.map((column, index) => (
                <TableHead
                  key={`${group.label}-${column.key}`}
                  scope="col"
                  aria-sort={ariaSort(params, column.key as RankingSortKey)}
                  className={cn(
                    numCell,
                    index === 0 && "border-l border-border",
                    column.key === points && "bg-muted",
                  )}
                >
                  <SortLink
                    params={params}
                    sortKey={column.key as RankingSortKey}
                    firstDir={defaultDirFor(column.key as RankingSortKey)}
                    label={column.title}
                  >
                    <ColumnLabel label={column.label} title={column.title} />
                  </SortLink>
                </TableHead>
              )),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.id} className="group">
              <TableCell
                className={cn(
                  stickyPlayer,
                  "group-hover:bg-muted group-focus-within:bg-muted",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {offset + index + 1}
                  </span>
                  <PlayerNameButton
                    id={row.id}
                    fullName={row.fullName}
                    name={row.name}
                    position={row.position}
                    team={row.team}
                  >
                    <span className="block truncate text-xs text-muted-foreground">
                      {row.position ?? "–"} - {row.team ?? "FA"}
                    </span>
                    {singleWeek && row.opponent ? (
                      <span className="block truncate text-xs text-faint">
                        {row.isHome === false ? "@ " : "vs "}
                        {row.opponent}
                      </span>
                    ) : null}
                  </PlayerNameButton>
                </div>
              </TableCell>
              <TableCell className={cn("border-l border-border", numCell)}>
                {row.gp}
              </TableCell>
              {groups.map((group) =>
                group.columns.map((column, i) => (
                  <TableCell
                    key={`${group.label}-${column.key}`}
                    className={cn(
                      numCell,
                      i === 0 && "border-l border-border",
                      column.key === points && "bg-muted font-semibold",
                    )}
                  >
                    {formatStat(
                      row.stats[column.key as keyof RankingRow["stats"]],
                    )}
                  </TableCell>
                )),
              )}
            </TableRow>
          ))}
        </TableBody>
      </table>
    </div>
  )
}
