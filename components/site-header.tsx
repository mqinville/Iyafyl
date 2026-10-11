import Image from "next/image"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"
import { NavLinks } from "@/components/nav-links"
import { OpenPlayerCardsButton } from "@/components/player-card/open-player-cards-button"
import { PlayerSearch, PlayerSearchTrigger } from "@/components/player-search"
import { ProfileMenu } from "@/components/profile-menu"
import { getUserEmail } from "@/lib/server/auth-session"

export async function SiteHeader() {
  const email = await getUserEmail()

  return (
    <header className="flex items-center justify-between gap-2 border-b border-rule-strong gutter-x py-[22px] sm:gap-4">
      <Link
        href="/"
        aria-label="IYAFYL home"
        className="inline-flex shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <Image
          src="/logo.svg"
          alt=""
          width={91}
          height={36}
          loading="eager"
          className="h-[36px] w-[91px]"
        />
      </Link>
      {/* Search needs a session: the API answers 401 when signed out. */}
      {email ? (
        <PlayerSearch
          shortcut
          className="hidden min-w-0 flex-1 xl:block xl:max-w-md 2xl:max-w-lg"
        />
      ) : null}
      <div className="flex shrink-0 items-center gap-2 sm:gap-6">
        <NavLinks className="hidden lg:flex" />
        <div className="flex items-center gap-0 sm:gap-1">
          {email ? <OpenPlayerCardsButton /> : null}
          {email ? <PlayerSearchTrigger /> : null}
          <ProfileMenu email={email} />
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
