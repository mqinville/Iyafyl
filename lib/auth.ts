// Auth contract shared by the form and the server actions in lib/server/auth-actions.ts.
// Keep this module free of "use client" and server-only imports.

export type AuthMode = "sign-in" | "sign-up"

export const FIELD_ORDER = ["email", "password", "confirm"] as const
export type FieldName = (typeof FIELD_ORDER)[number]
export type FieldErrors = Partial<Record<FieldName, string>>

export const MIN_PASSWORD_LENGTH = 8
export const EMAIL_PATTERN = /^\S+@\S+\.\S+$/
// Mirrors password_requirements = "letters_digits" in supabase/config.toml.
export const LETTER_PATTERN = /[a-z]/i
export const DIGIT_PATTERN = /[0-9]/

export const authRoutes = {
  signIn: "/login",
  signUp: "/signup",
  forgotPassword: "/forgot-password",
  authError: "/auth/error",
  home: "/",
} as const

const PUBLIC_PATHS: readonly string[] = [
  authRoutes.signIn,
  authRoutes.signUp,
  authRoutes.forgotPassword,
]

// Pages reachable while signed out: the auth pages and everything under /auth.
// /auth is matched by segment, so /authors is not public.
export function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/")
  )
}

// Same-origin path only: resolve against a fixed base and compare, so tricks like
// "//host", "/\host" or "/%09/host" can't point elsewhere. Auth pages map to home
// so a post-sign-in redirect can't loop.
export function safeNext(value: string | null | undefined): string {
  if (!value) {
    return authRoutes.home
  }
  const base = "http://localhost"
  try {
    const url = new URL(value, base)
    if (url.origin !== base || isPublicPath(url.pathname)) {
      return authRoutes.home
    }
    return url.pathname + url.search
  } catch {
    return authRoutes.home
  }
}

export interface AuthFormState {
  status: "idle" | "error" | "success"
  errors: FieldErrors
  message: string
  // Echoed back so the email survives React's post-action form reset. Never a password.
  email?: string
}

export const initialAuthFormState: AuthFormState = {
  status: "idle",
  errors: {},
  message: "",
}

interface AuthCopy {
  submitLabel: string
  pendingLabel: string
}

export const authCopy: Record<AuthMode, AuthCopy> = {
  "sign-in": {
    submitLabel: "Sign in",
    pendingLabel: "Signing in…",
  },
  "sign-up": {
    submitLabel: "Create account",
    pendingLabel: "Creating account…",
  },
}

export const fieldMessages = {
  email: "Enter a valid email address.",
  passwordRequired: "Enter your password.",
  passwordShort: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
  passwordWeak: "Use at least one letter and one number.",
  confirmMismatch: "Passwords don't match.",
  passwordHint: `At least ${MIN_PASSWORD_LENGTH} characters, with a letter and a number.`,
} as const

export function validate(
  mode: AuthMode,
  email: string,
  password: string,
  confirm: string,
): FieldErrors {
  const errors: FieldErrors = {}
  if (!EMAIL_PATTERN.test(email)) {
    errors.email = fieldMessages.email
  }
  if (!password) {
    errors.password = fieldMessages.passwordRequired
  } else if (mode === "sign-up" && password.length < MIN_PASSWORD_LENGTH) {
    errors.password = fieldMessages.passwordShort
  } else if (
    mode === "sign-up" &&
    !(LETTER_PATTERN.test(password) && DIGIT_PATTERN.test(password))
  ) {
    errors.password = fieldMessages.passwordWeak
  }
  if (mode === "sign-up" && confirm !== password) {
    errors.confirm = fieldMessages.confirmMismatch
  }
  return errors
}
