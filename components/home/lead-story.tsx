import type { FC } from "react"

import { formatPoints } from "@/lib/format"
import { weeklyStory } from "@/lib/league"
import type { LeagueRecap, RecapEmptyReason, RecapMatchup } from "@/lib/types"

const sectionClass =
  "flex flex-col items-center gap-[22px] gutter-x pt-20 pb-16 text-center"
const kickerClass =
  "text-brand-text text-[11px] font-semibold tracking-[0.24em] uppercase"
const headlineClass =
  "font-display max-w-[980px] text-5xl leading-none font-semibold text-balance sm:text-7xl lg:text-[88px]"
const deckClass = "text-prose max-w-[600px] text-xl leading-normal text-pretty"

interface LeadStoryProps {
  recap: LeagueRecap
}

interface StoryBodyProps {
  kicker: string
  headline: string
  deck: string
  matchups?: RecapMatchup[]
}

function emptyDeck(reason: RecapEmptyReason): string {
  switch (reason) {
    case "no_prior_week":
      return "The first week has not finished, so there is no previous week to recap."
    case "not_started":
      return "The league has not started, so there is no week to recap."
    default: {
      const unreachable: never = reason
      return unreachable
    }
  }
}

function matchupCopy(matchup: RecapMatchup): {
  headline: string
  deck: string
} {
  if (matchup.winnerRosterId === null) {
    const score = formatPoints(matchup.a.points)
    return {
      headline: `${matchup.a.teamName} and ${matchup.b.teamName} tied at ${score}`,
      deck: `Both teams scored ${score}.`,
    }
  }
  const winner =
    matchup.winnerRosterId === matchup.a.rosterId ? matchup.a : matchup.b
  const loser = winner.rosterId === matchup.a.rosterId ? matchup.b : matchup.a
  return {
    headline: `${winner.teamName} scored ${formatPoints(winner.points)}`,
    deck: `${winner.teamName} beat ${loser.teamName} by ${formatPoints(winner.points - loser.points)}.`,
  }
}

const StoryBody: FC<StoryBodyProps> = ({
  kicker,
  headline,
  deck,
  matchups,
}) => {
  return (
    <section className={sectionClass}>
      <span className={kickerClass}>{kicker}</span>
      <h1 className={headlineClass}>{headline}</h1>
      <p className={deckClass}>{deck}</p>
      {matchups && matchups.length > 0 ? (
        <ul className="text-prose font-mono flex w-full max-w-[600px] flex-col gap-1 text-sm">
          {matchups.map((matchup) => (
            <li key={matchup.matchupId}>
              {matchup.a.teamName} {formatPoints(matchup.a.points)} –{" "}
              {matchup.b.teamName} {formatPoints(matchup.b.points)}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

const LeadStory: FC<LeadStoryProps> = ({ recap }) => {
  switch (recap.source) {
    case "placeholder":
      return (
        <StoryBody
          kicker={`Week ${weeklyStory.week} · ${weeklyStory.season}`}
          headline={weeklyStory.headline}
          deck={weeklyStory.deck}
        />
      )
    case "sleeper-unavailable":
      return (
        <section className={sectionClass}>
          <h1 className={deckClass}>
            This week&apos;s recap is unavailable right now.
          </h1>
        </section>
      )
    case "sleeper":
      switch (recap.outcome) {
        case "empty":
          return (
            <StoryBody
              kicker={recap.season}
              headline="No completed week yet"
              deck={emptyDeck(recap.reason)}
            />
          )
        case "matchups": {
          const featured = recap.matchups[0]
          if (!featured) {
            return (
              <section className={sectionClass}>
                <h1 className={deckClass}>
                  This week&apos;s recap is unavailable right now.
                </h1>
              </section>
            )
          }
          const copy = matchupCopy(featured)
          return (
            <StoryBody
              kicker={`Week ${recap.week} · ${recap.season}`}
              headline={copy.headline}
              deck={copy.deck}
              matchups={recap.matchups}
            />
          )
        }
        default: {
          const unreachable: never = recap
          return unreachable
        }
      }
    default: {
      const unreachable: never = recap
      return unreachable
    }
  }
}

export default LeadStory
