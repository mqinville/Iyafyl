import type { Metadata } from "next"
import Link from "next/link"
import { authRoutes } from "@/lib/auth"
import { brandLinkClass } from "@/lib/link-classes"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Link expired",
}

export default function AuthErrorPage() {
  return (
    <main
      id="main"
      className="gutter-x flex flex-col items-center gap-[22px] pt-20 pb-16 text-center"
    >
      <h1 className="font-display text-5xl leading-none font-semibold text-balance sm:text-7xl">
        That link didn&apos;t work
      </h1>
      <p className="max-w-xl text-xl leading-normal text-balance text-muted-foreground">
        The confirmation link is invalid or has expired. Try signing in, or sign
        up again to get a new link.
      </p>
      <div className="flex items-center gap-6">
        <Link
          href={authRoutes.signIn}
          className={cn(brandLinkClass, "text-sm")}
        >
          Sign in
        </Link>
        <Link
          href={authRoutes.signUp}
          className={cn(brandLinkClass, "text-sm")}
        >
          Sign up
        </Link>
      </div>
    </main>
  )
}
