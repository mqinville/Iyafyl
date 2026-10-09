import type { Metadata } from "next"
import { ComingSoon } from "@/components/coming-soon"

export const metadata: Metadata = {
  title: "Standings",
}

export default function StandingsPage() {
  return <ComingSoon title="Standings" />
}
