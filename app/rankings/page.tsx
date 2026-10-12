import type { Metadata } from "next"
import Link from "next/link"
import { RankingsFilters } from "@/components/rankings/rankings-filters"
import { RankingsTable } from "@/components/rankings/rankings-table"
import {
  RANKINGS_PAGE_SIZE,
  parseRankingsParams,
  rankingsHref,
} from "@/lib/rankings"
import { getPlayerRankings } from "@/lib/server/rankings"

export const metadata: Metadata = {
  title: "Rankings",
}

const pagerClass =
  "inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
const pagerOffClass =
  "inline-flex h-9 items-center rounded-md border border-border px-4 text-sm text-faint"

interface RankingsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function RankingsPage({
  searchParams,
}: RankingsPageProps) {
  const params = parseRankingsParams(await searchParams)
  const outcome = await getPlayerRankings(params)

  return (
    <main id="main" className="pb-16">
      <section className="gutter-x flex flex-col gap-4 pt-8 pb-4">
        <h1 className="font-display text-4xl leading-none font-semibold sm:text-5xl">
          Player rankings
        </h1>
        <RankingsFilters params={params} />
      </section>
      <section className="gutter-x">
        {outcome.status !== "ok" ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {outcome.status === "unauthorized"
              ? "Sign in to see player rankings."
              : "Rankings are unavailable right now."}
          </p>
        ) : outcome.rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No players match these filters.
            </p>
            <Link
              href={
                params.page > 1
                  ? rankingsHref(params, { page: 1 })
                  : "/rankings"
              }
              className={pagerClass}
            >
              {params.page > 1 ? "Back to page 1" : "Reset filters"}
            </Link>
          </div>
        ) : (
          <>
            <RankingsTable params={params} rows={outcome.rows} />
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <p className="font-mono text-sm text-muted-foreground tabular-nums">
                Showing {(params.page - 1) * RANKINGS_PAGE_SIZE + 1}–
                {(params.page - 1) * RANKINGS_PAGE_SIZE + outcome.rows.length}{" "}
                of {outcome.total.toLocaleString("en-US")}
              </p>
              <nav aria-label="Pagination" className="flex gap-2">
                {params.page > 1 ? (
                  <Link
                    href={rankingsHref(params, { page: params.page - 1 })}
                    className={pagerClass}
                  >
                    Previous
                  </Link>
                ) : (
                  <span className={pagerOffClass}>Previous</span>
                )}
                {params.page * RANKINGS_PAGE_SIZE < outcome.total ? (
                  <Link
                    href={rankingsHref(params, { page: params.page + 1 })}
                    className={pagerClass}
                  >
                    Next
                  </Link>
                ) : (
                  <span className={pagerOffClass}>Next</span>
                )}
              </nav>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
