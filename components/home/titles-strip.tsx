import type { FC } from "react"

import { cn } from "@/lib/utils"
import type { LeagueTitles } from "@/lib/types"

interface TitlesStripProps {
  titles: LeagueTitles
}

const labelClass = "text-[10px] font-semibold tracking-[0.22em] uppercase"

const TitlesStrip: FC<TitlesStripProps> = ({ titles }) => {
  const { guru, kingShit } = titles

  return (
    <section className="border-t-rule-double border-b-rule-strong gutter-mx grid grid-cols-1 border-t-[3px] border-double border-b md:grid-cols-2">
      <div className="border-rule grid grid-cols-[140px_1fr] items-center gap-7 border-b py-9 md:border-r md:border-b-0 md:pr-10">
        <div className="border-rule placeholder-stripes text-faint flex h-[180px] items-center justify-center border text-center font-mono text-[10px]">
          3D trophy
        </div>
        <div className="flex flex-col gap-2">
          <span className={cn("text-brand-text", labelClass)}>Fantasy Guru</span>
          <span className="font-display text-5xl leading-none font-semibold">
            {guru.manager}
          </span>
          <span className="text-muted-foreground text-[13px]">
            {guru.team} · {guru.note}
          </span>
        </div>
      </div>
      <div className="flex flex-col justify-center gap-2 py-9 md:pl-10">
        <span
          className={cn(
            "text-foreground dark:text-muted-foreground",
            labelClass
          )}
        >
          King Sh*t
        </span>
        <span className="font-display text-5xl leading-none font-semibold">
          {kingShit.manager}
        </span>
        <span className="text-prose text-lg italic">
          {kingShit.punishment}
        </span>
      </div>
    </section>
  )
}

export default TitlesStrip
