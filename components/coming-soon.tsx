import Link from "next/link"
import type { FC } from "react"
import { brandLinkClass } from "@/lib/link-classes"
import { cn } from "@/lib/utils"

interface ComingSoonProps {
  title: string
  link?: { href: string; label: string }
}

export const ComingSoon: FC<ComingSoonProps> = ({ title, link }) => {
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
      {link ? (
        <Link href={link.href} className={cn(brandLinkClass, "text-sm")}>
          {link.label}
        </Link>
      ) : null}
    </main>
  )
}
