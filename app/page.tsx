import LeadStory from "@/components/home/lead-story"
import TitlesStrip from "@/components/home/titles-strip"
import TopOfTable from "@/components/home/top-of-table"
import { leagueTitles } from "@/lib/league"
import { getHomeData, getLeagueRecap } from "@/lib/server/sleeper"

export default async function Home() {
  const [home, recap] = await Promise.all([getHomeData(), getLeagueRecap()])

  return (
    <main id="main">
      <LeadStory recap={recap} />
      <TitlesStrip titles={leagueTitles} />
      <TopOfTable home={home} />
    </main>
  )
}
