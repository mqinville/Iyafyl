"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  authRoutes,
  validate,
  type AuthFormState,
  type AuthMode,
  type FieldName,
} from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const UNAVAILABLE_MESSAGE = "Accounts are unavailable right now. Try again later."
const GENERIC_MESSAGE = "Something went wrong. Try again in a moment."
const RATE_LIMIT_MESSAGE = "Too many attempts. Wait a minute and try again."
// Also used when the email already has an account, so the form never says whether it does.
const CHECK_EMAIL_MESSAGE =
  "Check your email for a confirmation link to finish signing up."

function readField(formData: FormData, name: FieldName): string {
  return String(formData.get(name) ?? "")
}

function failure(message: string): AuthFormState {
  return { status: "error", errors: {}, message }
}

// Maps a Supabase auth error code (never the message) to form state.
function mapAuthError(
  mode: AuthMode,
  code: string | undefined
): AuthFormState | null {
  switch (code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return failure(RATE_LIMIT_MESSAGE)
    case "invalid_credentials":
      return failure("Incorrect email or password.")
    case "email_not_confirmed":
      return failure("Confirm your email first. Check your inbox for the link.")
    case "weak_password":
      return {
        status: "error",
        errors: { password: "Choose a stronger password." },
        message: "",
      }
    case "email_address_invalid":
    case "email_address_not_authorized":
      return mode === "sign-up"
        ? {
            status: "error",
            errors: { email: "Use a different email address." },
            message: "",
          }
        : null
    case "signup_disabled":
    case "email_provider_disabled":
      return failure(UNAVAILABLE_MESSAGE)
    case "user_already_exists":
    case "email_exists":
      return mode === "sign-up"
        ? { status: "success", errors: {}, message: CHECK_EMAIL_MESSAGE }
        : null
    default:
      return null
  }
}

export async function authAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const mode: AuthMode =
    formData.get("mode") === "sign-up" ? "sign-up" : "sign-in"
  const email = readField(formData, "email").trim()
  const password = readField(formData, "password")
  const confirm = readField(formData, "confirm")

  const errors = validate(mode, email, password, confirm)
  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, message: "", email }
  }

  const supabase = await createClient()
  if (!supabase) return { ...failure(UNAVAILABLE_MESSAGE), email }

  if (mode === "sign-in") {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const mapped = mapAuthError(mode, error.code)
      if (mapped) return { ...mapped, email }
      console.error("Supabase sign-in failed", error)
      return { ...failure(GENERIC_MESSAGE), email }
    }
  } else {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      const mapped = mapAuthError(mode, error.code)
      if (mapped) return { ...mapped, email }
      console.error("Supabase sign-up failed", error)
      return { ...failure(GENERIC_MESSAGE), email }
    }
    // No session: confirmation is required (or the email already has an
    // account, where identities is empty). Both get the same neutral message.
    if (!data.session) {
      return { status: "success", errors: {}, message: CHECK_EMAIL_MESSAGE }
    }
  }

  revalidatePath("/", "layout")
  redirect(authRoutes.home)
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  if (supabase) {
    const { error } = await supabase.auth.signOut()
    if (error) console.error("Supabase sign-out failed", error)
  }
  revalidatePath("/", "layout")
  redirect(authRoutes.home)
}
