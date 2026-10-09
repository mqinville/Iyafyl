"use client"

import { Info } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FC,
} from "react"
import { FormField } from "@/components/auth/form-field"
import { PasswordInput } from "@/components/auth/password-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { brandLinkClass } from "@/lib/link-classes"
import { cn } from "@/lib/utils"
import {
  FIELD_ORDER,
  fieldMessages,
  MIN_PASSWORD_LENGTH,
  authAction,
  authCopy,
  authRoutes,
  initialAuthFormState,
  type AuthMode,
  type FieldName,
} from "@/lib/auth"

interface AuthFormProps {
  mode: AuthMode
}

type Dismissed = Partial<Record<FieldName | "notice", true>>

// 16px text (no iOS focus zoom) and a 44px tap height.
const controlClass = "h-11 text-base md:text-base"

export const AuthForm: FC<AuthFormProps> = ({ mode }) => {
  const isSignUp = mode === "sign-up"
  const copy = authCopy[mode]
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(
    authAction,
    initialAuthFormState
  )
  // Controlled values: React resets uncontrolled fields after an action.
  const [values, setValues] = useState<Record<FieldName, string>>({
    email: "",
    password: "",
    confirm: "",
  })
  // Errors and the notice the user has edited away since the last result.
  const [dismissed, setDismissed] = useState<Dismissed>({})
  const [seenState, setSeenState] = useState(state)
  if (seenState !== state) {
    // New action result: show its errors and notice again.
    setSeenState(state)
    setDismissed({})
  }

  const fieldRefs = useRef<Partial<Record<FieldName, HTMLInputElement | null>>>(
    {}
  )

  useEffect(() => {
    if (state.status === "success") {
      router.push(authRoutes.home)
      return
    }
    const first = FIELD_ORDER.find((name) => state.errors[name])
    if (first) fieldRefs.current[first]?.focus()
  }, [state, router])

  const handleChange =
    (name: FieldName) => (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setValues((current) => ({ ...current, [name]: value }))
      setDismissed((current) => ({ ...current, [name]: true, notice: true }))
    }

  const errorFor = (name: FieldName) =>
    dismissed[name] ? undefined : state.errors[name]
  const notice = dismissed.notice ? "" : state.message

  return (
    <form noValidate action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="mode" value={mode} />

      <FormField label="Email" error={errorFor("email")}>
        {(control) => (
          <Input
            {...control}
            ref={(node) => {
              fieldRefs.current.email = node
            }}
            name={"email" satisfies FieldName}
            type="email"
            autoComplete="email"
            required
            value={values.email}
            onChange={handleChange("email")}
            className={controlClass}
          />
        )}
      </FormField>

      <FormField
        label="Password"
        error={errorFor("password")}
        hint={isSignUp ? fieldMessages.passwordHint : undefined}
        labelAccessory={
          isSignUp ? null : (
            <Link
              href={authRoutes.forgotPassword}
              className={cn(
                brandLinkClass,
                "-my-3 inline-flex min-h-11 items-center text-sm"
              )}
            >
              Forgot password?
            </Link>
          )
        }
      >
        {(control) => (
          <PasswordInput
            {...control}
            ref={(node) => {
              fieldRefs.current.password = node
            }}
            name={"password" satisfies FieldName}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={isSignUp ? MIN_PASSWORD_LENGTH : undefined}
            value={values.password}
            onChange={handleChange("password")}
            className={controlClass}
          />
        )}
      </FormField>

      {isSignUp ? (
        <FormField label="Confirm password" error={errorFor("confirm")}>
          {(control) => (
            <PasswordInput
              {...control}
              ref={(node) => {
                fieldRefs.current.confirm = node
              }}
              name={"confirm" satisfies FieldName}
              autoComplete="new-password"
              required
              value={values.confirm}
              onChange={handleChange("confirm")}
              className={controlClass}
            />
          )}
        </FormField>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={isPending}
        className="mt-1 h-11 w-full text-base"
      >
        {isPending ? copy.pendingLabel : copy.submitLabel}
      </Button>

      <div role="status" aria-live="polite">
        {notice ? (
          <p className="flex items-start gap-2 border-l-2 border-brand bg-muted px-3 py-2.5 text-sm text-prose">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{notice}</span>
          </p>
        ) : null}
      </div>
    </form>
  )
}
