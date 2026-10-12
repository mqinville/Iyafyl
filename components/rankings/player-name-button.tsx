"use client"

import type { FC, ReactNode } from "react"
import { PlayerAvatar } from "@/components/player-avatar"
import { usePlayerTabs } from "@/components/player-card/player-tabs-provider"
import { playerImageUrl } from "@/lib/sleeper-cdn"

interface PlayerNameButtonProps {
  id: string
  fullName: string
  name: string
  position: string | null
  team: string | null
  children?: ReactNode
}

// Opens (or activates) the player's tab in the global player card popout.
export const PlayerNameButton: FC<PlayerNameButtonProps> = ({
  id,
  fullName,
  name,
  position,
  team,
  children,
}) => {
  const { openPlayer } = usePlayerTabs()

  return (
    <button
      type="button"
      aria-label={`Open player card for ${fullName}`}
      onClick={() => openPlayer({ id, name: fullName, position, team })}
      className="flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="hidden shrink-0 sm:block">
        <PlayerAvatar
          name={fullName}
          imageUrl={playerImageUrl(id, position)}
          position={position}
        />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{name}</span>
        {children}
      </span>
    </button>
  )
}
