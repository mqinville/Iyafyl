import LeadStory from "@/components/home/lead-story"
import TitlesStrip from "@/components/home/titles-strip"
import TopOfTable from "@/components/home/top-of-table"
import { leagueTitles, weeklyStory } from "@/lib/league"
import { getHomeData } from "@/lib/server/sleeper"

export default async function Home() {
  const home = await getHomeData()

  return (
    <main id="main">
      <LeadStory
        week={weeklyStory.week}
        season={weeklyStory.season}
        headline={weeklyStory.headline}
        deck={weeklyStory.deck}
      />
      <TitlesStrip titles={leagueTitles} />
      <TopOfTable home={home} />
    </main>
  )
}
