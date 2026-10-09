"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { FC } from "react"
import { authRoutes } from "@/lib/auth"
import { navLinkClass, navTextClass } from "@/lib/link-classes"
import { cn } from "@/lib/utils"

const authPaths: readonly string[] = [
  authRoutes.signIn,
  authRoutes.signUp,
  authRoutes.forgotPassword,
]

export const SignInLink: FC = () => {
  const pathname = usePathname()
  const active = authPaths.includes(pathname)

  return (
    <Link
      href={authRoutes.signIn}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-my-3 inline-flex min-h-11 items-center",
        navTextClass,
        navLinkClass(active)
      )}
    >
      Sign in
    </Link>
  )
}
