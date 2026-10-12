"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FC,
} from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ScoringFormat } from "@/lib/player-card"
import {
  LATEST_SEASON,
  MIN_SEASON,
  POSITION_FILTERS,
  maxWeek,
  rankingsHref,
  type PlayerStatus,
  type RankingsParams,
} from "@/lib/rankings"
import type { SeasonType } from "@/lib/types"
import { cn } from "@/lib/utils"

const SEARCH_DEBOUNCE_MS = 300

const seasons = Array.from(
  { length: LATEST_SEASON - MIN_SEASON + 1 },
  (_, i) => LATEST_SEASON - i,
)

const SCORING_OPTIONS: { value: ScoringFormat; label: string }[] = [
  { value: "ppr", label: "PPR" },
  { value: "half_ppr", label: "Half PPR" },
  { value: "std", label: "Standard" },
]

const STATUS_OPTIONS: { value: PlayerStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
]

const SEASON_TYPE_OPTIONS: { value: SeasonType; label: string }[] = [
  { value: "regular", label: "Regular season" },
  { value: "post", label: "Postseason" },
]

const ALL_WEEKS = "all"

const pillBase =
  "inline-flex h-8 shrink-0 items-center rounded-full border px-3.5 text-xs font-semibold tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

interface RankingsFiltersProps {
  params: RankingsParams
}

export const RankingsFilters: FC<RankingsFiltersProps> = ({ params }) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState(params.search)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Follow the URL when it changes elsewhere (reset link, back button).
  const [seenSearch, setSeenSearch] = useState(params.search)
  if (seenSearch !== params.search) {
    setSeenSearch(params.search)
    setSearch(params.search)
  }

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
      }
    }
  }, [])

  const go = (patch: Partial<RankingsParams>) => {
    startTransition(() => {
      router.push(rankingsHref(params, patch))
    })
  }

  const onSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setSearch(value)
    if (timer.current) {
      clearTimeout(timer.current)
    }
    timer.current = setTimeout(() => {
      if (value.trim() !== params.search) {
        go({ search: value.trim() })
      }
    }, SEARCH_DEBOUNCE_MS)
  }

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <nav
          aria-label="Position"
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-1"
        >
          {POSITION_FILTERS.map((position) => {
            const active = params.position === position
            return (
              <Link
                key={position}
                href={rankingsHref(params, { position })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  pillBase,
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {position}
              </Link>
            )
          })}
        </nav>
        <Input
          type="search"
          value={search}
          onChange={onSearch}
          placeholder="Find player"
          aria-label="Find player"
          maxLength={50}
          className="md:max-w-60"
        />
      </div>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          pending && "motion-safe:animate-pulse",
        )}
      >
        <Select
          value={String(params.season)}
          onValueChange={(value) => go({ season: Number(value) })}
        >
          <SelectTrigger aria-label="Season" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {seasons.map((season) => (
              <SelectItem key={season} value={String(season)}>
                {season}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={params.seasonType}
          onValueChange={(value) => go({ seasonType: value as SeasonType })}
        >
          <SelectTrigger aria-label="Season type" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEASON_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={params.week === null ? ALL_WEEKS : String(params.week)}
          onValueChange={(value) =>
            go({ week: value === ALL_WEEKS ? null : Number(value) })
          }
        >
          <SelectTrigger aria-label="Week" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_WEEKS}>Season</SelectItem>
            {Array.from(
              { length: maxWeek(params.seasonType) },
              (_, i) => i + 1,
            ).map((week) => (
              <SelectItem key={week} value={String(week)}>
                Week {week}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div
          role="group"
          aria-label="Player status"
          className="inline-flex h-9 rounded-full border border-border bg-card p-0.5"
        >
          {STATUS_OPTIONS.map((option) => {
            const active = params.status === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => go({ status: option.value })}
                className={cn(
                  "cursor-pointer rounded-full px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        <Select
          value={params.scoring}
          onValueChange={(value) => go({ scoring: value as ScoringFormat })}
        >
          <SelectTrigger aria-label="Scoring" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCORING_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
