"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FC,
  type ReactNode,
} from "react"
import type {
  PlayerCard,
  PlayerCardErrorResponse,
  PlayerCardResponse,
  PlayerTab,
} from "@/lib/types"

export const PLAYER_TABS_STORAGE_KEY = "iyafyl-player-tabs"
export const MAX_PLAYER_TABS = 8

// "error" covers "unavailable" and network failures, which both offer a retry.
export type PlayerCardStatus =
  | "loading"
  | "ready"
  | "error"
  | Exclude<PlayerCardErrorResponse["error"], "unavailable">

export interface PlayerCardState {
  status: PlayerCardStatus
  card: PlayerCard | null
}

interface TabsState {
  tabs: PlayerTab[]
  activeId: string | null
  open: boolean
}

interface PlayerTabsContextValue {
  tabs: PlayerTab[]
  activeId: string | null
  open: boolean
  // Any page can call this with just these four fields.
  openPlayer: (player: PlayerTab) => void
  closePlayer: (id: string) => void
  setActive: (id: string) => void
  setOpen: (open: boolean) => void
  clearPlayers: () => void
  retryCard: (id: string) => void
  cards: Record<string, PlayerCardState>
}

const PlayerTabsContext = createContext<PlayerTabsContextValue | null>(null)

const EMPTY: TabsState = { tabs: [], activeId: null, open: false }

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string"
}

// Copies only the PlayerTab fields, so entries stored by older versions (with
// imageUrl/active) still load.
function toTab(value: unknown): PlayerTab | null {
  if (typeof value !== "object" || value === null) {
    return null
  }
  const v = value as Record<string, unknown>
  if (
    typeof v.id !== "string" ||
    typeof v.name !== "string" ||
    !isNullableString(v.position) ||
    !isNullableString(v.team)
  ) {
    return null
  }
  return { id: v.id, name: v.name, position: v.position, team: v.team }
}

function readStored(): Pick<TabsState, "tabs" | "activeId"> | null {
  try {
    const raw = sessionStorage.getItem(PLAYER_TABS_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) {
      return null
    }
    const { tabs, activeId } = parsed as Record<string, unknown>
    if (!Array.isArray(tabs)) {
      return null
    }
    const valid = tabs
      .map(toTab)
      .filter((tab): tab is PlayerTab => tab !== null)
      .slice(0, MAX_PLAYER_TABS)
    const active =
      typeof activeId === "string" && valid.some((tab) => tab.id === activeId)
        ? activeId
        : (valid[0]?.id ?? null)
    return { tabs: valid, activeId: active }
  } catch {
    return null
  }
}

interface PlayerTabsProviderProps {
  children: ReactNode
}

export const PlayerTabsProvider: FC<PlayerTabsProviderProps> = ({
  children,
}) => {
  const [state, setState] = useState<TabsState>(EMPTY)
  const [cards, setCards] = useState<Record<string, PlayerCardState>>({})
  const [hydrated, setHydrated] = useState(false)

  // Hydrate after mount (not in initial state) to avoid a hydration mismatch.
  useEffect(() => {
    const stored = readStored()
    if (stored && stored.tabs.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sessionStorage hydration, deliberately after mount
      setState({ ...stored, open: false })
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) {
      return
    }
    try {
      if (state.tabs.length === 0) {
        sessionStorage.removeItem(PLAYER_TABS_STORAGE_KEY)
      } else {
        sessionStorage.setItem(
          PLAYER_TABS_STORAGE_KEY,
          JSON.stringify({ tabs: state.tabs, activeId: state.activeId }),
        )
      }
    } catch {
      // Storage unavailable: tabs just won't survive a reload.
    }
  }, [hydrated, state.tabs, state.activeId])

  const { activeId } = state
  const hasEntry = activeId !== null && activeId in cards

  // Fetch when a tab becomes active and has no cached result yet.
  useEffect(() => {
    if (!activeId || hasEntry) {
      return
    }
    const controller = new AbortController()
    const finish = (entry: PlayerCardState) => {
      setCards((prev) => ({ ...prev, [activeId]: entry }))
    }
    fetch(`/api/players/${encodeURIComponent(activeId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response
            .json()
            .catch(() => null)) as PlayerCardErrorResponse | null
          const error = body?.error
          finish({
            status:
              error === "unauthorized" || error === "not_found"
                ? error
                : "error",
            card: null,
          })
          return
        }
        const data = (await response.json()) as PlayerCardResponse
        finish({ status: "ready", card: data.card })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
        finish({ status: "error", card: null })
      })
    return () => controller.abort()
  }, [activeId, hasEntry])

  const openPlayer = useCallback((player: PlayerTab) => {
    // Store only the tab fields; callers may pass richer objects.
    const tab: PlayerTab = {
      id: player.id,
      name: player.name,
      position: player.position,
      team: player.team,
    }
    setState((prev) => {
      if (prev.tabs.some((tab) => tab.id === player.id)) {
        return { ...prev, activeId: player.id, open: true }
      }
      let tabs = prev.tabs
      if (tabs.length >= MAX_PLAYER_TABS) {
        const drop = tabs.findIndex((tab) => tab.id !== prev.activeId)
        tabs = tabs.filter((_, index) => index !== drop)
      }
      return { tabs: [...tabs, tab], activeId: tab.id, open: true }
    })
  }, [])

  const closePlayer = useCallback((id: string) => {
    setState((prev) => {
      const index = prev.tabs.findIndex((tab) => tab.id === id)
      if (index === -1) {
        return prev
      }
      const tabs = prev.tabs.filter((tab) => tab.id !== id)
      if (tabs.length === 0) {
        return EMPTY
      }
      if (prev.activeId !== id) {
        return { ...prev, tabs }
      }
      // Right neighbor slid into `index`; fall back to the left one.
      const next = tabs[index] ?? tabs[index - 1]
      return { ...prev, tabs, activeId: next?.id ?? null }
    })
  }, [])

  const setActive = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeId: id }))
  }, [])

  const setOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }))
  }, [])

  const clearPlayers = useCallback(() => {
    setState(EMPTY)
    setCards({})
    try {
      sessionStorage.removeItem(PLAYER_TABS_STORAGE_KEY)
    } catch {
      // Ignore: nothing to clear.
    }
  }, [])

  const retryCard = useCallback((id: string) => {
    setCards((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const value = useMemo<PlayerTabsContextValue>(
    () => ({
      tabs: state.tabs,
      activeId: state.activeId,
      open: state.open,
      openPlayer,
      closePlayer,
      setActive,
      setOpen,
      clearPlayers,
      retryCard,
      cards,
    }),
    [
      state,
      cards,
      openPlayer,
      closePlayer,
      setActive,
      setOpen,
      clearPlayers,
      retryCard,
    ],
  )

  return (
    <PlayerTabsContext.Provider value={value}>
      {children}
    </PlayerTabsContext.Provider>
  )
}

export function usePlayerTabs(): PlayerTabsContextValue {
  const context = useContext(PlayerTabsContext)
  if (!context) {
    throw new Error("usePlayerTabs must be used within PlayerTabsProvider")
  }
  return context
}

// Status of one player's card; "loading" until the fetch settles.
export function usePlayerCard(id: string | null): PlayerCardState {
  const { cards } = usePlayerTabs()
  if (id === null) {
    return { status: "loading", card: null }
  }
  return cards[id] ?? { status: "loading", card: null }
}
