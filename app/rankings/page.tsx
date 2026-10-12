import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { RankingsFilters } from "@/components/rankings/rankings-filters"
import { RankingsSkeleton } from "@/components/rankings/rankings-skeleton"
import { SortFocusRestorer } from "@/components/rankings/sort-link"
import { RankingsTable } from "@/components/rankings/rankings-table"
import {
  RANKINGS_PAGE_SIZE,
  type RankingsParams,
  parseRankingsParams,
  rankingsHref,
} from "@/lib/rankings"
import { getFlockRankingSets, getPlayerRankings } from "@/lib/server/rankings"

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

interface RankingsResultsProps {
  params: RankingsParams
}

// Async, so it can't be typed as FC; keyed by the page's Suspense boundary.
async function RankingsResults({ params }: RankingsResultsProps) {
  const outcome = await getPlayerRankings(params)

  if (outcome.status !== "ok") {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {outcome.status === "unauthorized"
          ? "Sign in to see player rankings."
          : "Rankings are unavailable right now."}
      </p>
    )
  }
  if (outcome.rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p role="status" className="text-sm text-muted-foreground">
          No players match these filters.
        </p>
        <Link
          href={
            params.page > 1 ? rankingsHref(params, { page: 1 }) : "/rankings"
          }
          className={pagerClass}
        >
          {params.page > 1 ? "Back to page 1" : "Reset filters"}
        </Link>
      </div>
    )
  }
  return (
    <>
      <RankingsTable params={params} rows={outcome.rows} />
      <SortFocusRestorer />
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
        <p
          role="status"
          className="font-mono text-sm text-muted-foreground tabular-nums"
        >
          Showing {(params.page - 1) * RANKINGS_PAGE_SIZE + 1}–
          {(params.page - 1) * RANKINGS_PAGE_SIZE + outcome.rows.length} of{" "}
          {outcome.total.toLocaleString("en-US")}
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
  )
}

export default async function RankingsPage({
  searchParams,
}: RankingsPageProps) {
  const parsed = parseRankingsParams(await searchParams)
  const flockSets = await getFlockRankingSets()
  const flockCreators: Record<string, string[]> = Object.fromEntries(
    flockSets.map((set) => [set.list, set.creators]),
  )
  // A stale or foreign ?creator= falls back to consensus.
  const params: RankingsParams =
    flockSets.length > 0 &&
    parsed.flockCreator !== null &&
    !(flockCreators[parsed.flockList] ?? []).includes(parsed.flockCreator)
      ? { ...parsed, flockCreator: null }
      : parsed
  const flockUpdated = flockSets.find((set) => set.list === params.flockList)

  return (
    <main id="main" className="pb-16">
      <section className="gutter-x flex flex-col gap-4 pt-8 pb-4">
        <h1 className="font-display text-4xl leading-none font-semibold sm:text-5xl">
          Player rankings
        </h1>
        <RankingsFilters params={params} flockCreators={flockCreators} />
        {flockUpdated ? (
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <p>
              Flock rankings updated{" "}
              {new Date(flockUpdated.fetchedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })}
            </p>
            <p>
              – means not ranked. Flock ranks kickers and defenses on a separate
              list, shown in POS RK.
            </p>
          </div>
        ) : null}
      </section>
      <section className="gutter-x">
        <Suspense key={JSON.stringify(params)} fallback={<RankingsSkeleton />}>
          <RankingsResults params={params} />
        </Suspense>
      </section>
    </main>
  )
}
