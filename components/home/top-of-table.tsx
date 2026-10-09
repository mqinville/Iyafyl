import Link from "next/link"
import type { FC } from "react"

import { formatRecord } from "@/lib/format"
import type { HomeData } from "@/lib/types"

const TOP_N = 6

interface TopOfTableProps {
  home: HomeData
}

const TopOfTable: FC<TopOfTableProps> = ({ home }) => {
  const top =
    home.source === "sleeper-unavailable"
      ? null
      : home.standings.slice(0, TOP_N)

  return (
    <section className="gutter-mx mb-14 pt-7">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="font-serif text-2xl font-semibold">Top of the table</h2>
        {home.source !== "sleeper-unavailable" ? (
          <Link
            href="/standings"
            className="text-brand-text focus-visible:outline-ring -my-3 inline-flex min-h-11 items-center text-xs font-semibold transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            All {home.totalTeams} teams →
          </Link>
        ) : null}
      </div>
      {top ? (
        /* overflow-hidden + -mr-px clips the last column's right border at every breakpoint */
        <div className="overflow-hidden">
          <div className="border-rule-strong -mr-px grid grid-cols-2 border-t sm:grid-cols-3 lg:grid-cols-6">
            {top.map((row) => (
              <div
                key={row.rosterId}
                className="border-rule-soft flex flex-col gap-1.5 border-r px-4 pt-4 lg:px-3 xl:px-4 pb-1"
              >
                <span className="text-faint font-mono text-[11px]">
                  No. {row.rank}
                </span>
                <span className="font-serif text-lg leading-[1.15] font-semibold">
                  {row.teamName}
                </span>
                <span className="text-muted-foreground text-xs">
                  {row.manager} ·{" "}
                  <span className="text-foreground font-mono">
                    {formatRecord(row.wins, row.losses, row.ties)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">
          Standings are unavailable right now.
        </p>
      )}
      {home.source === "placeholder" ? (
        <p className="text-muted-foreground mt-3 text-xs">
          Sample data. Connect a Sleeper league to show live standings.
        </p>
      ) : null}
    </section>
  )
}

export default TopOfTable
