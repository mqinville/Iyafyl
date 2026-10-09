import type { Metadata } from "next"
import { AuthPage } from "@/components/auth/auth-page"

export const metadata: Metadata = {
  title: "Create account",
}

export default function SignupPage() {
  return <AuthPage mode="sign-up" />
}
