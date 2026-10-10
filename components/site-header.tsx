import Image from "next/image"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"
import { NavLinks } from "@/components/nav-links"
import { ProfileMenu } from "@/components/profile-menu"
import { getSessionProfile } from "@/lib/server/auth-session"

export async function SiteHeader() {
  const profile = await getSessionProfile()

  return (
    <header className="flex items-center justify-between border-b border-rule-strong gutter-x py-[22px]">
      <Link
        href="/"
        aria-label="IYAFYL home"
        className="inline-flex focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
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
      <div className="flex items-center gap-6">
        <NavLinks className="hidden lg:flex" />
        <div className="flex items-center gap-1">
          <ProfileMenu
            email={profile?.email ?? null}
            displayName={profile?.displayName ?? null}
            signedIn={profile !== null}
          />
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
