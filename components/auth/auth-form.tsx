"use client"

import { Eye, EyeOff, Info } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type FC,
  type ReactNode,
} from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

interface FormFieldControlProps {
  id: string
  "aria-invalid": true | undefined
  "aria-describedby": string | undefined
}

interface FormFieldProps {
  label: string
  error?: string
  hint?: string
  labelAccessory?: ReactNode
  children: (control: FormFieldControlProps) => ReactNode
}

const FormField: FC<FormFieldProps> = ({
  label,
  error,
  hint,
  labelAccessory,
  children,
}) => {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  // The error replaces the hint so the two never stack.
  const showHint = Boolean(hint) && !error
  const describedBy = [error ? errorId : null, showHint ? hintId : null]
    .filter((value): value is string => value !== null)
    .join(" ")

  // The accessory sits after the control in the DOM (so Tab reaches the input
  // first) and is placed beside the label with grid areas.
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
      <Label htmlFor={id} className="col-start-1 row-start-1">
        {label}
      </Label>
      <div className="col-span-2 row-start-2">
        {children({
          id,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": describedBy || undefined,
        })}
      </div>
      {labelAccessory ? (
        <div className="col-start-2 row-start-1">{labelAccessory}</div>
      ) : null}
      {error ? (
        <p id={errorId} className="col-span-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {showHint ? (
        <p id={hintId} className="col-span-2 text-sm text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

type PasswordInputProps = Omit<ComponentProps<typeof Input>, "type">

const PasswordInput: FC<PasswordInputProps> = ({
  className,
  ...props
}) => {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
        className="absolute top-0 right-0 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-opacity outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}

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
