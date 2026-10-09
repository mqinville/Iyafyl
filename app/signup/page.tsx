import { Info } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { AuthForm } from "@/components/auth/auth-form"
import { authPreviewNote, authRoutes } from "@/lib/auth"
import { brandLinkClass } from "@/lib/link-classes"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Create account",
}

export default function SignupPage() {
  return (
    <main id="main" className="gutter-x pt-20 pb-16">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="font-display text-5xl leading-none font-semibold text-balance sm:text-7xl">
            Create account
          </h1>
          <p className="text-lg leading-normal text-balance text-muted-foreground">
            Join the league with an email and password.
          </p>
          <p className="text-sm text-balance text-muted-foreground">
            <Info
              className="mr-1.5 inline size-4 align-[-0.25em]"
              aria-hidden="true"
            />
            {authPreviewNote}
          </p>
        </div>
        <div className="flex w-full max-w-sm flex-col gap-8">
          <AuthForm mode="sign-up" />
          <p className="border-t border-rule pt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={authRoutes.signIn}
              className={cn(brandLinkClass, "inline-flex min-h-11 items-center")}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
