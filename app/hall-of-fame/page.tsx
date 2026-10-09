import type { Metadata } from "next"
import { ComingSoon } from "@/components/coming-soon"

export const metadata: Metadata = {
  title: "Hall of Fame",
}

export default function HallOfFamePage() {
  return <ComingSoon title="Hall of Fame" />
}
