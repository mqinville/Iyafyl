import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth/auth-form"
import { authRoutes, safeNext } from "@/lib/auth"
import { brandLinkClass } from "@/lib/link-classes"
import { getUserEmail } from "@/lib/server/auth-session"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Sign in",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const { next: rawNext } = await searchParams
  const next = safeNext(Array.isArray(rawNext) ? rawNext[0] : rawNext)
  if (await getUserEmail()) redirect(next)

  return (
    <main id="main" className="gutter-x pt-20 pb-16">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="font-display text-5xl leading-none font-semibold text-balance sm:text-7xl">
            Sign in
          </h1>
          <p className="text-lg leading-normal text-balance text-muted-foreground">
            Welcome back to the league.
          </p>
        </div>
        <div className="flex w-full max-w-sm flex-col gap-8">
          <AuthForm
            mode="sign-in"
            next={next === authRoutes.home ? undefined : next}
          />
          <p className="border-t border-rule pt-4 text-center text-sm text-muted-foreground">
            New to the league?{" "}
            <Link
              href={authRoutes.signUp}
              className={cn(brandLinkClass, "inline-flex min-h-11 items-center")}
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
