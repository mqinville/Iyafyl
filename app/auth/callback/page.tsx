import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ConfirmSession } from "@/components/auth/confirm-session"
import { authRoutes, safeNext } from "@/lib/auth"
import { brandLinkClass } from "@/lib/link-classes"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Confirming email",
}

interface AuthCallbackPageProps {
  searchParams: Promise<{
    code?: string | string[]
    next?: string | string[]
  }>
}

export default async function AuthCallbackPage({
  searchParams,
}: AuthCallbackPageProps) {
  const params = await searchParams
  const code = Array.isArray(params.code) ? params.code[0] : params.code
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next
  const next = safeNext(rawNext)

  if (code) {
    const target = new URLSearchParams()
    target.set("code", code)
    if (next !== authRoutes.home) {
      target.set("next", next)
    }
    redirect(`${authRoutes.confirm}?${target.toString()}`)
  }

  return (
    <main
      id="main"
      className="gutter-x flex flex-col items-center gap-[22px] pt-20 pb-16 text-center"
    >
      <h1 className="font-display text-5xl leading-none font-semibold text-balance sm:text-7xl">
        Confirming your email
      </h1>
      <p
        aria-live="polite"
        className="max-w-xl text-xl leading-normal text-balance text-muted-foreground"
      >
        Taking you into the league.
      </p>
      <Link href={authRoutes.signIn} className={cn(brandLinkClass, "text-sm")}>
        Sign in
      </Link>
      <ConfirmSession next={next} />
    </main>
  )
}
