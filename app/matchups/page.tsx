import type { Metadata } from "next"
import { ComingSoon } from "@/components/coming-soon"

export const metadata: Metadata = {
  title: "Matchups",
}

export default function MatchupsPage() {
  return <ComingSoon title="Matchups" />
}
