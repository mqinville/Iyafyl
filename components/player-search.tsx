"use client"

import { Loader2, Search, X } from "lucide-react"
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FC,
  type FocusEvent,
  type KeyboardEvent,
} from "react"
import { PlayerAvatar } from "@/components/player-avatar"
import { usePlayerTabs } from "@/components/player-card/player-tabs-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { PLAYER_SEARCH_MIN_LENGTH } from "@/lib/player-search"
import type { PlayerSearchResponse, PlayerSearchResult } from "@/lib/types"
import { cn } from "@/lib/utils"

const DEBOUNCE_MS = 200

type SearchStatus = "idle" | "loading" | "ready" | "error"

// Results are stored with the query they answer, so "loading" is derived
// (the typed query differs from the answered one) and can never get stuck.
interface SearchState {
  query: string
  results: PlayerSearchResult[]
  failed: boolean
}

const EMPTY_SEARCH: SearchState = { query: "", results: [], failed: false }

async function fetchPlayers(
  query: string,
  signal: AbortSignal,
): Promise<PlayerSearchResult[]> {
  const response = await fetch(
    `/api/players/search?q=${encodeURIComponent(query)}`,
    { signal },
  )
  if (!response.ok) {
    throw new Error(`Player search failed: ${response.status}`)
  }
  const body = (await response.json()) as PlayerSearchResponse
  return body.results
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  )
}

function playerMeta(player: PlayerSearchResult): string {
  const tail = player.active ? (player.team ?? "FA") : "Retired"
  return player.position ? `${player.position} · ${tail}` : tail
}

function statusMessage(status: SearchStatus, query: string): string {
  switch (status) {
    case "error":
      return "Search is unavailable right now."
    case "ready":
      return `No players found for “${query}”`
    default:
      return "Searching…"
  }
}

interface HighlightedNameProps {
  name: string
  query: string
}

const HighlightedName: FC<HighlightedNameProps> = ({ name, query }) => {
  const index = name.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1 || query.length === 0) {
    return <>{name}</>
  }
  const end = index + query.length
  return (
    <>
      {name.slice(0, index)}
      <span className="font-semibold">{name.slice(index, end)}</span>
      {name.slice(end)}
    </>
  )
}

interface PlayerSearchProps {
  className?: string
  autoFocus?: boolean
  inline?: boolean
  shortcut?: boolean
  // Runs after the card opens (e.g. the mobile sheet uses it to close).
  onSelect?: (player: PlayerSearchResult) => void
}

export const PlayerSearch: FC<PlayerSearchProps> = ({
  className,
  autoFocus,
  inline,
  shortcut,
  onSelect,
}) => {
  const { openPlayer } = usePlayerTabs()
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState<SearchState>(EMPTY_SEARCH)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const baseId = useId()
  const listId = `${baseId}-list`
  const optionId = (index: number) => `${baseId}-option-${index}`

  const trimmed = query.trim()
  const searchable = trimmed.length >= PLAYER_SEARCH_MIN_LENGTH
  const showPanel = open && searchable
  const { results } = search
  const status: SearchStatus = !searchable
    ? "idle"
    : search.query !== trimmed
      ? "loading"
      : search.failed
        ? "error"
        : "ready"

  useEffect(() => {
    if (trimmed.length < PLAYER_SEARCH_MIN_LENGTH) {
      return
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      fetchPlayers(trimmed, controller.signal)
        .then((next) => {
          setSearch({ query: trimmed, results: next, failed: false })
          setActiveIndex(-1)
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return
          }
          setSearch({ query: trimmed, results: [], failed: true })
        })
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [trimmed])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [])

  useEffect(() => {
    if (!shortcut) {
      return
    }
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        event.key !== "/" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditableTarget(event.target)
      ) {
        return
      }
      const input = inputRef.current
      if (!input || input.offsetParent === null) {
        return
      }
      event.preventDefault()
      input.focus()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [shortcut])

  useEffect(() => {
    if (activeIndex < 0) {
      return
    }
    document
      .getElementById(`${baseId}-option-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, baseId])

  const reset = () => {
    setQuery("")
    setSearch(EMPTY_SEARCH)
    setActiveIndex(-1)
  }

  const clear = () => {
    reset()
    inputRef.current?.focus()
  }

  const select = (player: PlayerSearchResult) => {
    if (status !== "ready") {
      return
    }
    openPlayer(player)
    onSelect?.(player)
    // Keep focus free to move into the dialog.
    reset()
    setOpen(false)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value
    setQuery(next)
    setActiveIndex(-1)
    if (next.trim().length < PLAYER_SEARCH_MIN_LENGTH) {
      setSearch(EMPTY_SEARCH)
    }
    setOpen(true)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const count = results.length
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault()
        if (!searchable) {
          return
        }
        if (!open) {
          setOpen(true)
          return
        }
        if (count > 0) {
          setActiveIndex((index) => (index + 1) % count)
        }
        return
      }
      case "ArrowUp": {
        event.preventDefault()
        if (open && count > 0) {
          setActiveIndex((index) => (index <= 0 ? count - 1 : index - 1))
        }
        return
      }
      case "Enter": {
        event.preventDefault()
        if (showPanel && activeIndex >= 0 && results[activeIndex]) {
          select(results[activeIndex])
        }
        return
      }
      case "Escape": {
        if (showPanel) {
          event.preventDefault()
          setOpen(false)
          setActiveIndex(-1)
        } else {
          clear()
        }
        return
      }
      case "Tab": {
        setOpen(false)
        return
      }
    }
  }

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false)
    }
  }

  const loading = status === "loading"
  const message = results.length === 0 ? statusMessage(status, trimmed) : null
  const announcement =
    status === "error"
      ? "Search is unavailable right now"
      : status === "ready"
        ? results.length > 0
          ? `${results.length} ${results.length === 1 ? "result" : "results"}`
          : "No players found"
        : ""

  return (
    <div
      ref={containerRef}
      onBlur={handleBlur}
      className={cn("relative", className)}
    >
      <div className="relative">
        {loading ? (
          <Loader2
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground motion-safe:animate-spin"
          />
        ) : (
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
        )}
        <Input
          ref={inputRef}
          type="search"
          // Fallback focus target when the player card closes (header copy only)
          data-player-search-focus={inline ? undefined : ""}
          role="combobox"
          aria-label="Search players"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showPanel && activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          autoFocus={autoFocus}
          placeholder="Search players"
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="pr-9 pl-9 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query.length > 0 ? (
          <button
            type="button"
            aria-label="Clear search"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clear}
            className="absolute top-1/2 right-1 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : (
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-2.5 hidden size-5 -translate-y-1/2 items-center justify-center rounded border border-border font-mono text-xs text-faint xl:inline-flex"
          >
            /
          </kbd>
        )}
      </div>
      {showPanel ? (
        <div
          className={cn(
            "rounded-md border border-border bg-background shadow-md",
            inline ? "mt-2" : "absolute top-full right-0 left-0 z-50 mt-1",
          )}
        >
          <ul
            id={listId}
            role="listbox"
            aria-label="Player results"
            className={cn(
              "overflow-auto py-1",
              inline ? "max-h-[50dvh]" : "max-h-80",
              results.length === 0 && "hidden",
            )}
          >
            {results.map((player, index) => (
              <li
                key={player.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => setActiveIndex(index)}
                onClick={() => select(player)}
                className={cn(
                  "flex cursor-default items-center gap-3 px-3 py-2",
                  index === activeIndex && "bg-muted",
                )}
              >
                <PlayerAvatar
                  name={player.name}
                  imageUrl={player.imageUrl}
                  position={player.position}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  <HighlightedName name={player.name} query={trimmed} />
                </span>
                <span
                  className={cn(
                    "shrink-0 font-mono text-xs text-muted-foreground",
                    !player.active && "text-faint",
                  )}
                >
                  {playerMeta(player)}
                </span>
              </li>
            ))}
          </ul>
          {message ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              {message}
            </div>
          ) : null}
        </div>
      ) : null}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}

export const PlayerSearchTrigger: FC = () => {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-player-search-focus
          className="size-11 xl:hidden"
        >
          <Search />
          <span className="sr-only">Search players</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="top"
        onEscapeKeyDown={(event) => {
          if (
            event.target instanceof HTMLElement &&
            event.target.getAttribute("aria-expanded") === "true"
          ) {
            event.preventDefault()
          }
        }}
      >
        <SheetTitle className="sr-only">Search players</SheetTitle>
        <PlayerSearch
          inline
          autoFocus
          onSelect={() => setOpen(false)}
          className="px-4 pt-4 pb-6 pr-16"
        />
      </SheetContent>
    </Sheet>
  )
}
