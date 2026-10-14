"use client"

import { X } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState, type FC, type KeyboardEvent } from "react"
import { GameLogTable } from "@/components/player-card/game-log-table"
import { PlayerCardHeader } from "@/components/player-card/player-card-header"
import {
  usePlayerCard,
  usePlayerTabs,
} from "@/components/player-card/player-tabs-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { PlayerCard, PlayerTab } from "@/lib/types"
import { cn } from "@/lib/utils"

const SEASON_PILLS = 5

const tabId = (id: string) => `player-tab-${id}`
const panelId = (id: string) => `player-panel-${id}`

function abbreviateName(player: PlayerTab): string {
  const words = player.name.split(/\s+/).filter(Boolean)
  if (player.position === "DEF" || words.length < 2) {
    return player.name
  }
  return `${words[0]?.[0] ?? ""}. ${words.slice(1).join(" ")}`
}

function tabSubtitle(player: PlayerTab): string {
  return [player.position, player.team ?? "FA"].filter(Boolean).join(" - ")
}

const TabStrip: FC = () => {
  const { tabs, activeId, setActive, closePlayer } = usePlayerTabs()
  // Set when a tab is closed by the user, so focus follows the new active tab.
  // Ordinary activeId changes (e.g. from search) must not steal focus.
  const focusAfterClose = useRef(false)

  useEffect(() => {
    if (!activeId) {
      return
    }
    const tab = document.getElementById(tabId(activeId))
    tab?.scrollIntoView({ block: "nearest", inline: "nearest" })
    if (focusAfterClose.current) {
      focusAfterClose.current = false
      tab?.focus()
    }
  }, [activeId, tabs.length])

  const close = (id: string) => {
    // Closing the last tab closes the dialog; there is no tab to focus.
    focusAfterClose.current = tabs.length > 1
    closePlayer(id)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === activeId)
    let next = -1
    switch (event.key) {
      case "ArrowRight":
        next = (index + 1) % tabs.length
        break
      case "ArrowLeft":
        next = (index - 1 + tabs.length) % tabs.length
        break
      case "Home":
        next = 0
        break
      case "End":
        next = tabs.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    const target = tabs[next]
    if (target) {
      setActive(target.id)
      document.getElementById(tabId(target.id))?.focus()
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Open players"
      onKeyDown={handleKeyDown}
      className="flex min-w-0 items-end gap-1 overflow-x-auto bg-muted px-3 pt-3 pr-14"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId
        return (
          <div
            key={tab.id}
            role="presentation"
            className={cn(
              "flex shrink-0 items-center rounded-t-lg border border-b-0 border-transparent motion-safe:transition-colors",
              active
                ? "border-border bg-card text-foreground"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            <button
              type="button"
              role="tab"
              id={tabId(tab.id)}
              aria-selected={active}
              // Only the active panel is rendered.
              aria-controls={active ? panelId(tab.id) : undefined}
              aria-keyshortcuts="Delete"
              tabIndex={active ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => {
                if (event.key === "Delete" || event.key === "Backspace") {
                  event.preventDefault()
                  close(tab.id)
                }
              }}
              className="flex min-h-11 flex-col items-start justify-center py-1.5 pr-1 pl-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:min-h-0"
            >
              <span className="text-sm leading-tight font-semibold whitespace-nowrap">
                {abbreviateName(tab)}
              </span>
              <span className="font-mono text-[11px] leading-tight text-muted-foreground">
                {tabSubtitle(tab)}
              </span>
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => close(tab.id)}
              aria-label={`Close ${tab.name}`}
              className="mr-1 inline-flex size-8 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:size-6"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

interface SeasonSelectorProps {
  seasons: number[]
  value: number
  onChange: (season: number) => void
}

const SeasonSelector: FC<SeasonSelectorProps> = ({
  seasons,
  value,
  onChange,
}) => {
  const pills = seasons.slice(0, SEASON_PILLS)
  const older = seasons.slice(SEASON_PILLS)
  const olderSelected = older.includes(value)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={1}
        value={olderSelected ? "" : String(value)}
        onValueChange={(next) => {
          if (next) {
            onChange(Number(next))
          }
        }}
        aria-label="Season"
      >
        {pills.map((season) => (
          <ToggleGroupItem
            key={season}
            value={String(season)}
            className="h-11 font-mono tabular-nums sm:h-8 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary data-[state=on]:hover:text-primary-foreground"
          >
            {season}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {older.length > 0 ? (
        <Select
          value={olderSelected ? String(value) : ""}
          onValueChange={(next) => onChange(Number(next))}
        >
          <SelectTrigger
            size="sm"
            aria-label="Older seasons"
            className={cn(
              "data-[size=sm]:h-11 sm:data-[size=sm]:h-8",
              olderSelected &&
                "border-primary bg-primary text-primary-foreground hover:bg-primary [&_svg]:text-primary-foreground",
            )}
          >
            <SelectValue placeholder="More" />
          </SelectTrigger>
          <SelectContent>
            {older.map((season) => (
              <SelectItem key={season} value={String(season)}>
                {season}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  )
}

interface GameLogsProps {
  card: PlayerCard
  season: number | undefined
  onSeasonChange: (season: number) => void
}

const GameLogs: FC<GameLogsProps> = ({ card, season, onSeasonChange }) => {
  const selected = season ?? card.seasons[0]
  return (
    <section
      aria-labelledby="game-logs-heading"
      className="flex flex-col gap-3"
    >
      <h3
        id="game-logs-heading"
        className="border-l-4 border-brand pl-3 font-display text-xl leading-none font-semibold tracking-wide text-foreground uppercase"
      >
        Game logs
      </h3>
      {selected === undefined ? (
        <p className="py-6 text-sm text-muted-foreground">No game logs yet.</p>
      ) : (
        <>
          <SeasonSelector
            seasons={card.seasons}
            value={selected}
            onChange={onSeasonChange}
          />
          <GameLogTable card={card} season={selected} />
        </>
      )}
    </section>
  )
}

interface PlayerPanelProps {
  player: PlayerTab
  season: number | undefined
  onSeasonChange: (season: number) => void
}

const PlayerPanel: FC<PlayerPanelProps> = ({
  player,
  season,
  onSeasonChange,
}) => {
  const { status, card } = usePlayerCard(player.id)
  const { retryCard, setOpen } = usePlayerTabs()

  let body
  if (status === "ready" && card) {
    body = (
      <div className="flex flex-col gap-8">
        <PlayerCardHeader bio={card.bio} />
        <GameLogs card={card} season={season} onSeasonChange={onSeasonChange} />
      </div>
    )
  } else if (status === "loading") {
    body = (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col gap-4 motion-safe:animate-pulse"
      >
        <span className="sr-only">Loading…</span>
        <div className="flex gap-5">
          <div className="size-32 rounded-[5px] bg-muted sm:size-40" />
          <div className="flex flex-1 flex-col gap-3 pt-2">
            <div className="h-10 w-2/3 rounded-[5px] bg-muted" />
            <div className="h-6 w-1/2 rounded-[5px] bg-muted" />
          </div>
        </div>
        <div className="h-64 rounded-[5px] bg-muted" />
      </div>
    )
  } else if (status === "not_found") {
    body = (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Player not found.
      </p>
    )
  } else if (status === "unauthorized") {
    body = (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Sign in to view players.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            {/* The dialog lives in the root layout, so close it before leaving */}
            <Link href="/login" onClick={() => setOpen(false)}>
              Sign in
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => retryCard(player.id)}
          >
            Try again
          </Button>
        </div>
      </div>
    )
  } else {
    body = (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Couldn’t load {player.name}.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => retryCard(player.id)}
        >
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div
      role="tabpanel"
      id={panelId(player.id)}
      aria-labelledby={tabId(player.id)}
      className="min-h-0 flex-1 overflow-y-auto bg-card p-5 sm:p-6"
    >
      {body}
    </div>
  )
}

export const PlayerCardDialog: FC = () => {
  const { tabs, activeId, open, setOpen } = usePlayerTabs()
  const active = tabs.find((tab) => tab.id === activeId)
  // Where Radix would return focus on close; if it is gone by then (e.g. the
  // mobile search sheet unmounted), a header control gets focus instead.
  const returnFocusRef = useRef<Element | null>(null)
  // Selected season per player, so each tab remembers its own.
  const [seasonById, setSeasonById] = useState<Record<string, number>>({})

  return (
    <Dialog open={open && tabs.length > 0} onOpenChange={setOpen}>
      <DialogContent
        aria-describedby="player-card-description"
        onOpenAutoFocus={(event) => {
          returnFocusRef.current = document.activeElement
          // Focus the active tab, not the first tab's close button.
          const tab = activeId ? document.getElementById(tabId(activeId)) : null
          if (tab) {
            event.preventDefault()
            tab.focus()
          }
        }}
        onCloseAutoFocus={(event) => {
          if (!returnFocusRef.current?.isConnected) {
            event.preventDefault()
            // After the next paint the reopen button exists (unless the last
            // tab was closed); otherwise fall back to the visible search.
            requestAnimationFrame(() => {
              const reopen = document.querySelector<HTMLElement>(
                "[data-player-cards-reopen]",
              )
              const search = [
                ...document.querySelectorAll<HTMLElement>(
                  "[data-player-search-focus]",
                ),
              ].find((el) => el.offsetParent)
              ;(reopen ?? search)?.focus()
            })
          }
        }}
        className="flex h-[calc(100dvh-1rem)] max-h-[90dvh] w-[calc(100%-1rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-w-5xl"
      >
        <DialogTitle className="sr-only">
          {active?.name ?? "Player cards"}
        </DialogTitle>
        <DialogDescription id="player-card-description" className="sr-only">
          {active
            ? `Bio and game logs for ${active.name}.`
            : "Player bio and game logs."}
        </DialogDescription>
        <TabStrip />
        {active ? (
          <PlayerPanel
            key={active.id}
            player={active}
            season={seasonById[active.id]}
            onSeasonChange={(season) =>
              setSeasonById((prev) => ({ ...prev, [active.id]: season }))
            }
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
