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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { segmentedGroupClass, segmentedItemClass } from "@/lib/link-classes"
import type { ScoringFormat } from "@/lib/player-card"
import {
  FLOCK_LISTS,
  LATEST_SEASON,
  MIN_SEASON,
  POSITION_FILTERS,
  maxWeek,
  rankingsHref,
  type FlockList,
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
const CONSENSUS = "consensus"

const pillBase =
  "inline-flex h-10 shrink-0 sm:h-8 items-center rounded-full border px-3.5 text-xs font-semibold tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

interface RankingsFiltersProps {
  params: RankingsParams
  // Creator display names per Flock list; empty until rankings are ingested.
  flockCreators: Record<string, string[]>
}

export const RankingsFilters: FC<RankingsFiltersProps> = ({
  params,
  flockCreators,
}) => {
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

  const go = (patch: Partial<RankingsParams>, replace = false) => {
    startTransition(() => {
      const href = rankingsHref(params, patch)
      if (replace) {
        router.replace(href)
      } else {
        router.push(href)
      }
    })
  }

  const creators = flockCreators[params.flockList] ?? []
  const noCreators = creators.length === 0

  const onFlockList = (value: FlockList) => {
    const next = flockCreators[value] ?? []
    go({
      flockList: value,
      flockCreator:
        params.flockCreator !== null && next.includes(params.flockCreator)
          ? params.flockCreator
          : null,
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
        go({ search: value.trim() }, true)
      }
    }, SEARCH_DEBOUNCE_MS)
  }

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <nav
          aria-label="Position"
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-1 max-md:pr-6 max-md:[mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]"
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
          "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center",
          pending && "motion-safe:animate-pulse",
        )}
      >
        <Select
          value={String(params.season)}
          onValueChange={(value) => go({ season: Number(value) })}
        >
          <SelectTrigger aria-label="Season" className="w-full sm:w-28">
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
          <SelectTrigger aria-label="Season type" className="w-full sm:w-40">
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
          <SelectTrigger aria-label="Week" className="w-full sm:w-32">
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
        <ToggleGroup
          type="single"
          spacing={1}
          value={params.status}
          onValueChange={(value) => {
            // Radix reports "" when the active item is clicked again.
            if (value) {
              go({ status: value as PlayerStatus })
            }
          }}
          aria-label="Player status"
          className={cn(
            segmentedGroupClass,
            "order-last col-span-2 w-full sm:order-none sm:w-fit",
          )}
        >
          {STATUS_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className={cn(segmentedItemClass, "flex-1 px-3 sm:flex-none")}
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Select
          value={params.scoring}
          onValueChange={(value) => go({ scoring: value as ScoringFormat })}
        >
          <SelectTrigger aria-label="Scoring" className="w-full sm:w-32">
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
      <div
        role="group"
        aria-label="Flock rankings"
        className={cn(
          "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center",
          pending && "motion-safe:animate-pulse",
        )}
      >
        <span className="col-span-2 text-xs font-semibold tracking-wider text-muted-foreground">
          FLOCK
        </span>
        <Select value={params.flockList} onValueChange={onFlockList}>
          <SelectTrigger
            aria-label="Flock ranking list"
            className="w-full sm:w-36"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FLOCK_LISTS.map((list) => (
              <SelectItem key={list.value} value={list.value}>
                {list.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={params.flockCreator ?? CONSENSUS}
          disabled={noCreators}
          onValueChange={(value) =>
            go({ flockCreator: value === CONSENSUS ? null : value })
          }
        >
          <SelectTrigger
            aria-label="Ranking source"
            aria-describedby={noCreators ? "creators-empty" : undefined}
            className="w-full sm:w-44"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CONSENSUS}>Consensus</SelectItem>
            {creators.map((creator) => (
              <SelectItem key={creator} value={creator}>
                {creator}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {noCreators ? (
          <p
            id="creators-empty"
            className="col-span-2 text-xs text-muted-foreground sm:col-auto"
          >
            Creator rankings not loaded yet
          </p>
        ) : null}
        <button
          type="button"
          aria-pressed={params.rankedOnly}
          onClick={() => go({ rankedOnly: !params.rankedOnly })}
          className={cn(
            pillBase,
            "col-span-2 cursor-pointer justify-center sm:col-auto",
            params.rankedOnly
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          Ranked only
        </button>
      </div>
    </div>
  )
}
