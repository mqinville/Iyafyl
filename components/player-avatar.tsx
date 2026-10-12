"use client"

import Image from "next/image"
import { useState, type FC } from "react"
import { cn } from "@/lib/utils"

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? ""
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : ""
  return (first + last).toUpperCase()
}

interface PlayerAvatarProps {
  name: string
  imageUrl: string
  position: string | null
}

// Headshot from the Sleeper CDN (team logo for defenses). Decorative, since
// the name sits next to it; a missing photo (403) falls back to initials.
export const PlayerAvatar: FC<PlayerAvatarProps> = ({
  name,
  imageUrl,
  position,
}) => {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[11px] text-muted-foreground"
      >
        {initials(name)}
      </span>
    )
  }
  return (
    <Image
      src={imageUrl}
      alt=""
      width={32}
      height={32}
      onError={() => setFailed(true)}
      className={cn(
        "size-8 shrink-0 rounded-full bg-muted",
        position === "DEF" ? "object-contain p-0.5" : "object-cover",
      )}
    />
  )
}
