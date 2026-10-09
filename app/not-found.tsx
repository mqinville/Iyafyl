import type { Metadata } from "next"
import Link from "next/link"
import { brandLinkClass } from "@/lib/link-classes"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Page not found" }

export default function NotFound() {
  return (
    <main
      id="main"
      className="gutter-x flex flex-col items-center gap-[22px] pt-20 pb-16 text-center"
    >
      <h1 className="font-display text-5xl leading-none font-semibold text-balance sm:text-7xl">
        Page not found
      </h1>
      <p className="text-xl leading-normal text-muted-foreground">
        That page is out of bounds.
      </p>
      <Link
        href="/"
        className={cn(brandLinkClass, "text-sm")}
      >
        Back home →
      </Link>
    </main>
  )
}
