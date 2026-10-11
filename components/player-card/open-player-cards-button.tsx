"use client"

import { IdCard } from "lucide-react"
import type { FC } from "react"
import { usePlayerTabs } from "@/components/player-card/player-tabs-provider"
import { Button } from "@/components/ui/button"

export const OpenPlayerCardsButton: FC = () => {
  const { tabs, open, setOpen } = usePlayerTabs()

  if (tabs.length === 0 || open) {
    return null
  }
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => setOpen(true)}
      aria-label={`Open player cards (${tabs.length})`}
      title="Open player cards"
      data-player-cards-reopen=""
      className="h-11 gap-1 px-2 sm:h-8"
    >
      <IdCard aria-hidden="true" />
      <span className="font-mono text-xs tabular-nums">{tabs.length}</span>
    </Button>
  )
}
