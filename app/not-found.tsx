import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = { title: "Page not found" }

export default function NotFound() {
  return (
    <main
      id="main"
      className="gutter-x flex flex-col items-center gap-[22px] pt-20 pb-16 text-center"
    >
      <h1 className="font-display text-5xl leading-none font-normal tracking-[-0.015em] text-balance sm:text-7xl">
        Page not found
      </h1>
      <p className="font-serif text-xl leading-normal text-muted-foreground">
        That page is out of bounds.
      </p>
      <Link
        href="/"
        className="text-brand-text focus-visible:outline-ring text-sm font-semibold transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        Back home →
      </Link>
    </main>
  )
}
