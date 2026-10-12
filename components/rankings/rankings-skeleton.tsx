import type { FC } from "react"

const SKELETON_ROWS = 10

// Shown while a new query loads; replaces the table so every navigation
// (sort, pill, pagination, select, search) has visible pending feedback.
export const RankingsSkeleton: FC = () => {
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        Loading rankings
      </p>
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-lg border border-border bg-card motion-safe:animate-pulse"
      >
        <div className="h-10 border-b border-border bg-muted/50" />
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <div
            key={i}
            className="flex h-14 items-center gap-3 border-b border-border px-3 last:border-b-0"
          >
            <div className="h-3 w-5 rounded bg-muted" />
            <div className="h-3 w-28 rounded bg-muted sm:w-40" />
            <div className="ml-auto h-3 w-1/3 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
