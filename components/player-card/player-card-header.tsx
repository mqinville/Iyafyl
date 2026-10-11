"use client"

import Image from "next/image"
import { useState, type FC } from "react"
import { ageFrom, formatHeight } from "@/lib/player-card"
import { teamLogoUrl } from "@/lib/sleeper-cdn"
import type { PlayerCardBio } from "@/lib/types"
import { cn } from "@/lib/utils"

function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? ""
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : ""
  return (first + last).toUpperCase()
}

function teamLabel(bio: PlayerCardBio): string {
  if (bio.team) {
    return bio.team
  }
  return bio.active ? "Free agent" : "Retired"
}

interface HeadshotProps {
  bio: PlayerCardBio
}

const Headshot: FC<HeadshotProps> = ({ bio }) => {
  const [failed, setFailed] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)
  const isDef = bio.position === "DEF"

  return (
    <div className="relative size-32 shrink-0 overflow-hidden rounded-[5px] border border-border bg-muted sm:size-40">
      {bio.team && !logoFailed && !isDef ? (
        <Image
          src={teamLogoUrl(bio.team)}
          alt=""
          width={160}
          height={160}
          onError={() => setLogoFailed(true)}
          className="absolute inset-0 size-full object-contain p-3 opacity-15"
        />
      ) : null}
      {failed ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center font-display text-4xl font-semibold text-muted-foreground"
        >
          {initialsOf(bio.name)}
        </span>
      ) : (
        <Image
          src={bio.imageUrl}
          alt=""
          width={160}
          height={160}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 size-full",
            isDef ? "object-contain p-4" : "object-cover object-top",
          )}
        />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-primary px-2 py-1 text-center font-mono text-[11px] font-medium tracking-wide text-primary-foreground">
        {[
          bio.position,
          bio.team
            ? `${bio.team}${bio.jerseyNumber !== null ? ` #${bio.jerseyNumber}` : ""}`
            : teamLabel(bio),
        ]
          .filter(Boolean)
          .join(" · ")}
      </div>
    </div>
  )
}

interface BioStatProps {
  label: string
  value: string
}

const BioStat: FC<BioStatProps> = ({ label, value }) => {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold tracking-wider text-faint uppercase">
        {label}
      </dt>
      <dd className="font-mono break-words text-sm text-foreground tabular-nums">
        {value}
      </dd>
    </div>
  )
}

interface PlayerCardHeaderProps {
  bio: PlayerCardBio
}

export const PlayerCardHeader: FC<PlayerCardHeaderProps> = ({ bio }) => {
  const age = ageFrom(bio.birthDate)
  const height = formatHeight(bio.heightIn)

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <Headshot bio={bio} />
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-4xl leading-none font-semibold text-foreground sm:text-5xl">
            {bio.name}
          </h2>
          {bio.injuryStatus ? (
            <span className="rounded-[5px] bg-destructive px-2 py-0.5 font-mono text-xs font-medium text-background">
              <span className="sr-only">Injury status: </span>
              {bio.injuryStatus}
            </span>
          ) : null}
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-2">
          <BioStat label="Age" value={age !== null ? String(age) : "–"} />
          <BioStat label="Height" value={height ?? "–"} />
          <BioStat
            label="Weight"
            value={bio.weightLb !== null ? `${bio.weightLb} lbs` : "–"}
          />
          <BioStat
            label="Exp"
            value={bio.yearsExp !== null ? String(bio.yearsExp) : "–"}
          />
          <BioStat label="College" value={bio.college ?? "–"} />
        </dl>
      </div>
    </div>
  )
}
