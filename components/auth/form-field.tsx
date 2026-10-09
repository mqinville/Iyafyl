import { useId, type FC, type ReactNode } from "react"
import { Label } from "@/components/ui/label"

export interface FormFieldControlProps {
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

export const FormField: FC<FormFieldProps> = ({
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
