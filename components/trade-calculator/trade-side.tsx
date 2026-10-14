"use client"

import { RotateCw, X } from "lucide-react"
import { useEffect, useRef, type FC } from "react"
import { PlayerSearch } from "@/components/player-search"
import { PlayerNameButton } from "@/components/rankings/player-name-button"
import { Button } from "@/components/ui/button"
import type { TradeRankEntry } from "@/lib/rankings"
import type { PlayerSearchResult } from "@/lib/types"
import { cn } from "@/lib/utils"

export const MAX_PER_SIDE = 10

export interface PickedPlayer {
  id: string
  name: string
  position: string | null
  team: string | null
}

export type RankState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; ranks: TradeRankEntry }

export interface SideRow {
  player: PickedPlayer
  state: RankState | undefined
  rank: number | null
  value: number | null
}

interface TradeSideProps {
  title: string
  caption: string
  rows: SideRow[]
  total: number | null
  discounted: boolean
  note: string | null
  onAdd: (player: PlayerSearchResult) => void
  onRemove: (id: string) => void
  onRetry: (id: string) => void
}

export const TradeSide: FC<TradeSideProps> = ({
  title,
  caption,
  rows,
  total,
  discounted,
  note,
  onAdd,
  onRemove,
  onRetry,
}) => {
  const full = rows.length >= MAX_PER_SIDE
  const capRef = useRef<HTMLParagraphElement>(null)

  // The search unmounts at the cap; move focus to the message, not the body.
  useEffect(() => {
    if (full) {
      capRef.current?.focus()
    }
  }, [full])

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl leading-none font-semibold">
          {title}
        </h2>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </div>
      {full ? (
        <p
          ref={capRef}
          tabIndex={-1}
          className="text-xs text-muted-foreground outline-none"
        >
          Maximum of {MAX_PER_SIDE} players per side.
        </p>
      ) : (
        <PlayerSearch
          inline
          openOnSelect={false}
          onSelect={onAdd}
          label={`Add player to ${title}`}
          placeholder="Add a player…"
        />
      )}
      {note ? (
        <p role="status" className="text-xs text-muted-foreground">
          {note}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Add a player
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map(({ player, state, rank, value }) => (
            <li key={player.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <PlayerNameButton
                  id={player.id}
                  fullName={player.name}
                  name={player.name}
                  position={player.position}
                  team={player.team}
                >
                  <span className="block truncate text-xs text-muted-foreground">
                    {player.position ?? "—"} · {player.team ?? "FA"}
                    {state?.status === "ready" ? (
                      rank === null ? (
                        " · Unranked"
                      ) : (
                        <>
                          {" · "}
                          <span className="sr-only">Rank </span>#
                          {Math.round(rank)}
                        </>
                      )
                    ) : null}
                  </span>
                </PlayerNameButton>
              </div>
              {state?.status === "error" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRetry(player.id)}
                  aria-label={`Retry loading rank for ${player.name}`}
                  className="h-10 gap-1 px-2 text-xs text-muted-foreground"
                >
                  <RotateCw aria-hidden="true" className="size-3.5" />
                  Retry
                </Button>
              ) : (
                <span
                  className={cn(
                    "w-10 shrink-0 text-right font-mono text-sm tabular-nums",
                    state?.status === "ready" && rank === null
                      ? "text-muted-foreground"
                      : "font-semibold",
                  )}
                >
                  {value === null ? (
                    <>
                      <span className="sr-only">Loading value</span>
                      <span aria-hidden="true">…</span>
                    </>
                  ) : (
                    <>
                      <span className="sr-only">Value </span>
                      {value}
                    </>
                  )}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(player.id)}
                aria-label={`Remove ${player.name}`}
                className="size-10 shrink-0 text-muted-foreground"
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground">
          TOTAL
        </span>
        <span className="text-right">
          <span className="font-mono text-xl font-semibold tabular-nums">
            {total === null ? "—" : total}
          </span>
          {discounted ? (
            <span className="block text-xs text-muted-foreground">
              Includes 3% package discount
            </span>
          ) : null}
        </span>
      </div>
    </div>
  )
}
