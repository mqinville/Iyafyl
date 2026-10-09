// Auth contract shared by the form and (later) a real backend.
// Keep this module free of "use client" and server-only imports.

export type AuthMode = "sign-in" | "sign-up"

export interface AuthCredentials {
  email: string
  password: string
}

export const FIELD_ORDER = ["email", "password", "confirm"] as const
export type FieldName = (typeof FIELD_ORDER)[number]
export type FieldErrors = Partial<Record<FieldName, string>>

export const MIN_PASSWORD_LENGTH = 8
export const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

export const authRoutes = {
  signIn: "/login",
  signUp: "/signup",
  forgotPassword: "/forgot-password",
  home: "/",
} as const

export type AuthResult = { ok: true } | { ok: false; message: string }

export interface AuthFormState {
  status: "idle" | "error" | "success"
  errors: FieldErrors
  message: string
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

export const authPreviewNote =
  "Preview: accounts aren't live yet, so nothing is saved."

export const fieldMessages = {
  email: "Enter a valid email address.",
  passwordRequired: "Enter your password.",
  passwordShort: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
  confirmMismatch: "Passwords don't match.",
  passwordHint: `At least ${MIN_PASSWORD_LENGTH} characters.`,
} as const

const NOT_LIVE_MESSAGE: Record<AuthMode, string> = {
  "sign-in": "Accounts aren't live yet. Sign-in is coming soon.",
  "sign-up": "Accounts aren't live yet. Account creation is coming soon.",
}

export function validate(
  mode: AuthMode,
  email: string,
  password: string,
  confirm: string
): FieldErrors {
  const errors: FieldErrors = {}
  if (!EMAIL_PATTERN.test(email)) {
    errors.email = fieldMessages.email
  }
  if (!password) {
    errors.password = fieldMessages.passwordRequired
  } else if (mode === "sign-up" && password.length < MIN_PASSWORD_LENGTH) {
    errors.password = fieldMessages.passwordShort
  }
  if (mode === "sign-up" && confirm !== password) {
    errors.confirm = fieldMessages.confirmMismatch
  }
  return errors
}

type AuthSubmitter = (
  mode: AuthMode,
  credentials: AuthCredentials
) => Promise<AuthResult>

// The single seam for real auth: replace the body with the actual sign-in or
// sign-up call (using `credentials`) and map its outcome to an AuthResult.
export const submitCredentials: AuthSubmitter = (mode) =>
  Promise.resolve({ ok: false, message: NOT_LIVE_MESSAGE[mode] })

function readField(formData: FormData, name: FieldName): string {
  return String(formData.get(name) ?? "")
}

// Shaped for useActionState. It runs client-side today. To go live, move it
// with submitCredentials into a "use server" file (e.g. lib/server/auth-actions.ts),
// keep validate() shared here, and call redirect() on success so the form's
// router.push branch can go.
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
    return { status: "error", errors, message: "" }
  }

  const result = await submitCredentials(mode, { email, password })
  return result.ok
    ? { status: "success", errors: {}, message: "" }
    : { status: "error", errors: {}, message: result.message }
}
