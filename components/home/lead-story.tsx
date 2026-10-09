import type { FC } from "react"

interface LeadStoryProps {
  week: number
  season: number
  headline: string
  deck: string
}

const LeadStory: FC<LeadStoryProps> = ({ week, season, headline, deck }) => {
  return (
    <section className="flex flex-col items-center gap-[22px] gutter-x pt-20 pb-16 text-center">
      <span className="text-brand-text text-[11px] font-semibold tracking-[0.24em] uppercase">
        Week {week} · {season}
      </span>
      <h1 className="font-display max-w-[980px] text-5xl leading-none font-normal tracking-[-0.015em] text-balance sm:text-7xl lg:text-[88px]">
        {headline}
      </h1>
      <p className="font-serif text-prose max-w-[600px] text-xl leading-normal text-pretty">
        {deck}
      </p>
    </section>
  )
}

export default LeadStory
