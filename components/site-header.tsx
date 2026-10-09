import Link from "next/link"
import type { FC } from "react"
import { MobileNav } from "@/components/mobile-nav"
import { NavLinks } from "@/components/nav-links"
import { ThemeToggle } from "@/components/theme-toggle"

export const SiteHeader: FC = () => {
  return (
    <header className="flex items-center justify-between border-b border-rule-strong gutter-x py-[22px]">
      <Link
        href="/"
        aria-label="IYAFYL home"
        className="inline-flex items-stretch rounded-[5px] font-logo text-[25px] leading-none font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring dark:ring-1 dark:ring-rule-strong"
      >
        <span className="rounded-l-[5px] bg-logo-ink pt-1.5 pr-1.5 pb-[5px] pl-2.5 text-logo-ink-foreground">
          Iyaf
        </span>
        <span className="rounded-r-[5px] bg-brand pt-1.5 pr-2.5 pb-[5px] pl-1.5 text-brand-ink">
          yl
        </span>
      </Link>
      <div className="flex items-center gap-6">
        <NavLinks className="hidden md:flex" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
