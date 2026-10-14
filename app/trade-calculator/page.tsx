import type { Metadata } from "next"
import { TradeCalculator } from "@/components/trade-calculator/trade-calculator"

export const metadata: Metadata = {
  title: "Trade Calculator",
}

export default function TradeCalculatorPage() {
  return (
    <main id="main" className="pb-16">
      <section className="gutter-x flex flex-col gap-2 pt-8 pb-4">
        <h1 className="font-display text-4xl leading-none font-semibold sm:text-5xl">
          Trade Calculator
        </h1>
        <p className="text-sm text-muted-foreground">
          Values come from Flock expert-average redraft ranks.
        </p>
        <p className="text-sm text-muted-foreground">
          Add the players you give up under They Receive and the players you get
          under I Receive. The verdict is from your side.
        </p>
      </section>
      <section className="gutter-x">
        <TradeCalculator />
      </section>
    </main>
  )
}
