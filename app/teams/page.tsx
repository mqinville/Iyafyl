import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Teams",
}

interface TeamsSection {
  id: string
  title: string
}

const sections: readonly TeamsSection[] = [
  { id: "teams", title: "Teams" },
  { id: "standings", title: "Standings" },
  { id: "matchups", title: "Matchups" },
]

export default function TeamsPage() {
  return (
    <main id="main">
      {sections.map((section, index) => {
        const Heading = index === 0 ? "h1" : "h2"
        return (
          <section
            key={section.id}
            id={section.id}
            className="gutter-x flex min-h-[70vh] scroll-mt-6 flex-col items-center justify-center gap-4 border-t border-rule py-16 text-center first:border-t-0"
          >
            <Heading className="font-display text-5xl leading-none font-semibold text-balance sm:text-7xl">
              {section.title}
            </Heading>
            <p className="text-xl leading-normal text-muted-foreground">
              Coming soon.
            </p>
          </section>
        )
      })}
    </main>
  )
}
