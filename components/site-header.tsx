import Image from "next/image"
import Link from "next/link"
import { SignInLink } from "@/components/auth/sign-in-link"
import { UserMenu } from "@/components/auth/user-menu"
import { MobileNav } from "@/components/mobile-nav"
import { NavLinks } from "@/components/nav-links"
import { ThemeToggle } from "@/components/theme-toggle"
import { getUserEmail } from "@/lib/server/auth-session"

export async function SiteHeader() {
  const email = await getUserEmail()

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
        {email ? <UserMenu email={email} /> : <SignInLink />}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
