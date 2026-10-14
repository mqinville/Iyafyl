"use client"

import { useCallback, useEffect, useRef, useState, type FC } from "react"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { segmentedGroupClass, segmentedItemClass } from "@/lib/link-classes"
import {
  FLOCK_LISTS,
  type FlockList,
  type TradeRankEntry,
  type TradeRankResponse,
} from "@/lib/rankings"
import {
  assetValue,
  sideTotal,
  tradeVerdict,
  type TradeSettings,
  type VerdictBand,
} from "@/lib/trade-value"
import type { PlayerSearchResult } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  MAX_PER_SIDE,
  TradeSide,
  type PickedPlayer,
  type RankState,
  type SideRow,
} from "./trade-side"

type SideKey = "them" | "me"

// Dynasty hooks in here: make `format` state and add dynasty rank lists.
const SETTINGS: TradeSettings = { format: "redraft", tePremium: false }

const BAND_TEXT: Record<VerdictBand, string> = {
  fair: "text-verdict-fair",
  slight: "text-verdict-slight",
  clear: "text-verdict-clear",
  robbery: "text-verdict-robbery",
}

const BAND_BG: Record<VerdictBand, string> = {
  fair: "bg-verdict-fair",
  slight: "bg-verdict-slight",
  clear: "bg-verdict-clear",
  robbery: "bg-verdict-robbery",
}

const SIDES: { key: SideKey; title: string; caption: string }[] = [
  { key: "them", title: "They Receive", caption: "You give" },
  { key: "me", title: "I Receive", caption: "You get" },
]

const NEUTRAL_SEGMENT = "bg-foreground/30"

async function fetchRanks(
  id: string,
  signal?: AbortSignal,
): Promise<TradeRankEntry> {
  const response = await fetch(
    `/api/players/trade-ranks?id=${encodeURIComponent(id)}`,
    { signal },
  )
  if (!response.ok) {
    throw new Error(`Trade ranks failed: ${response.status}`)
  }
  const body = (await response.json()) as TradeRankResponse
  return body.ranks
}

export const TradeCalculator: FC = () => {
  const [board, setBoard] = useState<FlockList>("REDRAFT")
  const [sides, setSides] = useState<Record<SideKey, PickedPlayer[]>>({
    them: [],
    me: [],
  })
  const [ranks, setRanks] = useState<Record<string, RankState>>({})
  const [notes, setNotes] = useState<Record<SideKey, string | null>>({
    them: null,
    me: null,
  })
  const controllers = useRef(new Map<string, AbortController>())

  useEffect(() => {
    const active = controllers.current
    return () => {
      active.forEach((controller) => controller.abort())
      active.clear()
    }
  }, [])

  const load = useCallback((id: string) => {
    controllers.current.get(id)?.abort()
    const controller = new AbortController()
    controllers.current.set(id, controller)
    setRanks((prev) => ({ ...prev, [id]: { status: "loading" } }))
    fetchRanks(id, controller.signal)
      .then((entry) => {
        if (controllers.current.get(id) !== controller) {
          return
        }
        controllers.current.delete(id)
        setRanks((prev) => ({
          ...prev,
          [id]: { status: "ready", ranks: entry },
        }))
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
        if (controllers.current.get(id) !== controller) {
          return
        }
        controllers.current.delete(id)
        setRanks((prev) => ({ ...prev, [id]: { status: "error" } }))
      })
  }, [])

  const add = (key: SideKey, result: PlayerSearchResult) => {
    const taken = sides.them.some((p) => p.id === result.id)
      ? "them"
      : sides.me.some((p) => p.id === result.id)
        ? "me"
        : null
    if (taken) {
      setNotes((prev) => ({
        ...prev,
        [key]: `${result.name} is already on the ${taken === "them" ? "They Receive" : "I Receive"} side.`,
      }))
      return
    }
    if (sides[key].length >= MAX_PER_SIDE) {
      return
    }
    setNotes((prev) => ({ ...prev, [key]: null }))
    setSides((prev) => ({
      ...prev,
      [key]: [
        ...prev[key],
        {
          id: result.id,
          name: result.name,
          position: result.position,
          team: result.team,
        },
      ],
    }))
    load(result.id)
  }

  const remove = (key: SideKey, id: string) => {
    controllers.current.get(id)?.abort()
    controllers.current.delete(id)
    setSides((prev) => ({
      ...prev,
      [key]: prev[key].filter((p) => p.id !== id),
    }))
    setRanks((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setNotes((prev) => ({ ...prev, [key]: null }))
  }

  const clear = () => {
    controllers.current.forEach((controller) => controller.abort())
    controllers.current.clear()
    setSides({ them: [], me: [] })
    setRanks({})
    setNotes({ them: null, me: null })
  }

  const rowsFor = (key: SideKey): SideRow[] =>
    sides[key].map((player) => {
      const state = ranks[player.id]
      if (state?.status !== "ready") {
        return { player, state, rank: null, value: null }
      }
      const rank = state.ranks[board]
      return {
        player,
        state,
        rank,
        value: assetValue({ rank, position: player.position }, SETTINGS),
      }
    })

  const rows = { them: rowsFor("them"), me: rowsFor("me") }
  const all = [...rows.them, ...rows.me]
  const anyLoading = all.some(
    (r) => r.state?.status !== "ready" && r.state?.status !== "error",
  )
  const anyError = all.some((r) => r.state?.status === "error")
  const bothFilled = rows.them.length > 0 && rows.me.length > 0

  const totalFor = (key: SideKey): number | null => {
    const values: number[] = []
    for (const row of rows[key]) {
      if (row.value === null) {
        return null
      }
      values.push(row.value)
    }
    return values.length === 0 ? null : sideTotal(values)
  }
  const totals = { them: totalFor("them"), me: totalFor("me") }
  const verdict =
    totals.them !== null && totals.me !== null
      ? tradeVerdict(totals.them, totals.me)
      : null
  const share =
    totals.them !== null && totals.me !== null && totals.them + totals.me > 0
      ? (totals.them / (totals.them + totals.me)) * 100
      : 50
  const anyUnranked = all.some(
    (r) => r.state?.status === "ready" && r.rank === null,
  )
  const announcement =
    bothFilled && anyError
      ? "Some ranks couldn't be loaded. Use Retry on the affected player."
      : bothFilled && !anyLoading && verdict
        ? `${verdict.label} ${verdict.gap.toFixed(1)}% gap.`
        : ""
  const segmentClass = (side: SideKey): string =>
    verdict && verdict.winner === side ? BAND_BG[verdict.band] : NEUTRAL_SEGMENT

  return (
    <div className="flex flex-col gap-4">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div className="order-1 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground">
          BOARD
        </span>
        <ToggleGroup
          type="single"
          spacing={1}
          value={board}
          onValueChange={(value) => {
            // Radix reports "" when the active item is clicked again.
            const option = FLOCK_LISTS.find((o) => o.value === value)
            if (option) {
              setBoard(option.value)
            }
          }}
          aria-label="Ranking board"
          className={segmentedGroupClass}
        >
          {FLOCK_LISTS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className={cn(segmentedItemClass, "px-4")}
            >
              {option.shortLabel}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {all.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            className="ml-auto h-10 text-xs text-muted-foreground"
          >
            Clear trade
          </Button>
        ) : null}
      </div>

      <div className="order-3 rounded-lg border border-border bg-card p-4 md:order-2">
        {!bothFilled ? (
          <p className="text-sm text-muted-foreground">
            Add at least one player to each side to see a verdict.
          </p>
        ) : anyError ? (
          <p className="text-sm text-muted-foreground">
            Some ranks couldn&apos;t be loaded. Use Retry on the affected
            player.
          </p>
        ) : anyLoading || !verdict ? (
          <p className="text-sm text-muted-foreground">Calculating…</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p
                className={cn(
                  "font-display text-3xl leading-none font-semibold sm:text-4xl",
                  BAND_TEXT[verdict.band],
                )}
              >
                {verdict.label}
              </p>
              <p className="font-mono text-sm tabular-nums text-muted-foreground">
                {verdict.gap.toFixed(1)}% gap
              </p>
            </div>
            <div
              aria-hidden="true"
              className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-background"
            >
              <div
                className={cn(
                  "h-full motion-safe:transition-[width] motion-safe:duration-300 motion-reduce:transition-none",
                  segmentClass("them"),
                )}
                style={{ width: `${share}%` }}
              />
              <div className={cn("h-full flex-1", segmentClass("me"))} />
            </div>
            <p className="flex justify-between gap-4 font-mono text-xs tabular-nums text-muted-foreground">
              {SIDES.map(({ key, title }) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-block size-2 rounded-full",
                      segmentClass(key),
                    )}
                  />
                  {title} {totals[key]}
                </span>
              ))}
            </p>
          </div>
        )}
      </div>

      <div className="order-2 flex flex-col gap-3 md:order-3">
        <div className="grid gap-4 md:grid-cols-2">
          {SIDES.map(({ key, title, caption }) => (
            <TradeSide
              key={key}
              title={title}
              caption={caption}
              rows={rows[key]}
              total={totals[key]}
              discounted={rows[key].length >= 2}
              note={notes[key]}
              onAdd={(player) => add(key, player)}
              onRemove={(id) => remove(key, id)}
              onRetry={load}
            />
          ))}
        </div>
        {anyUnranked ? (
          <p className="text-xs text-muted-foreground">
            Unranked players (including kickers and defenses) count as 1.
          </p>
        ) : null}
      </div>
    </div>
  )
}
