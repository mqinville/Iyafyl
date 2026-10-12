"use client"

import Link from "next/link"
import { useEffect, type FC, type ReactNode } from "react"
import {
  rankingsHref,
  type RankingSortKey,
  type RankingsParams,
} from "@/lib/rankings"
import { cn } from "@/lib/utils"

const FOCUS_KEY = "rankings:focus-sort"

interface SortLinkProps {
  params: RankingsParams
  sortKey: RankingSortKey
  firstDir: "asc" | "desc"
  label: string
  children: ReactNode
  className?: string
}

// A real link (works without JS). The click records the sort key so the
// header can be re-focused once the table remounts with the new results.
export const SortLink: FC<SortLinkProps> = ({
  params,
  sortKey,
  firstDir,
  label,
  children,
  className,
}) => {
  const active = params.sort === sortKey
  const dir = active ? (params.dir === "desc" ? "asc" : "desc") : firstDir
  return (
    <Link
      href={rankingsHref(params, { sort: sortKey, dir })}
      scroll={false}
      title={`Sort by ${label}`}
      data-sort-key={sortKey}
      onClick={(event) => {
        // Modified clicks open a new tab; this table won't remount.
        const newTab =
          event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0
        if (newTab) {
          return
        }
        try {
          sessionStorage.setItem(FOCUS_KEY, sortKey)
        } catch {
          // Storage unavailable; focus just isn't restored.
        }
      }}
      className={cn(
        "group/sort inline-flex items-center gap-0.5 rounded-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active && "text-foreground",
        className,
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className={cn(
          "w-2 text-[9px]",
          !active &&
            "text-faint opacity-0 group-hover/sort:opacity-100 group-focus-visible/sort:opacity-100",
        )}
      >
        {(active ? params.dir : dir) === "desc" ? "▼" : "▲"}
      </span>
    </Link>
  )
}

// Rendered after the table: re-focuses the sort header that was just used.
export const SortFocusRestorer: FC = () => {
  useEffect(() => {
    try {
      const key = sessionStorage.getItem(FOCUS_KEY)
      if (!key) {
        return
      }
      sessionStorage.removeItem(FOCUS_KEY)
      // Suspense may keep a hidden copy of the previous table; pick the
      // visible header.
      const target = [
        ...document.querySelectorAll<HTMLElement>(
          `[data-sort-key="${CSS.escape(key)}"]`,
        ),
      ].find((element) => element.offsetParent !== null)
      target?.focus({ preventScroll: true })
    } catch {
      // Storage unavailable.
    }
  }, [])
  return null
}
