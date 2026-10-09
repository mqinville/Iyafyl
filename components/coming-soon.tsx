import type { FC } from "react"

interface ComingSoonProps {
  title: string
}

export const ComingSoon: FC<ComingSoonProps> = ({ title }) => {
  return (
    <main
      id="main"
      className="gutter-x flex flex-col items-center gap-[22px] pt-20 pb-16 text-center"
    >
      <h1 className="font-display text-5xl leading-none font-semibold text-balance sm:text-7xl">
        {title}
      </h1>
      <p className="text-xl leading-normal text-muted-foreground">
        Coming soon.
      </p>
    </main>
  )
}
