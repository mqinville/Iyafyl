import type { Metadata } from "next"
import { ComingSoon } from "@/components/coming-soon"
import { authRoutes } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Reset password",
}

export default function ForgotPasswordPage() {
  return (
    <ComingSoon
      title="Reset password"
      link={{ href: authRoutes.signIn, label: "Back to sign in →" }}
    />
  )
}
