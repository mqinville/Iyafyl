"use client"

import { User } from "lucide-react"
import { useActionState, useId, useState, type FC } from "react"
import { SignInLink } from "@/components/auth/sign-in-link"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { signOutAction } from "@/lib/server/auth-actions"
import {
  initialLeagueIdFormState,
  saveLeagueIdAction,
} from "@/lib/server/league-actions"
import { cn } from "@/lib/utils"

interface ProfileMenuProps {
  email: string | null
  displayName: string | null
  leagueId: string | null
  signedIn: boolean
  hasEnvLeagueId: boolean
  supabaseAvailable: boolean
}

interface LeagueFormProps {
  leagueId: string | null
  hasEnvLeagueId: boolean
}

const LeagueForm: FC<LeagueFormProps> = ({ leagueId, hasEnvLeagueId }) => {
  const id = useId()
  const hintId = `${id}-hint`
  const messageId = `${id}-message`
  const [state, formAction, isPending] = useActionState(
    saveLeagueIdAction,
    initialLeagueIdFormState,
  )
  const [draft, setDraft] = useState(leagueId ?? "")
  const [seenState, setSeenState] = useState(state)
  const [hideMessage, setHideMessage] = useState(false)

  if (seenState !== state) {
    setSeenState(state)
    setHideMessage(false)
    if (state.status === "success") {
      setDraft(state.leagueId)
    }
  }

  const savedLeagueId =
    state.status === "success" ? state.leagueId : (leagueId ?? "")
  const showFallbackNote =
    savedLeagueId === "" && hasEnvLeagueId && draft.trim() === ""
  const message = hideMessage ? "" : state.message
  const describedBy = [
    showFallbackNote ? hintId : null,
    message ? messageId : null,
  ]
    .filter((value): value is string => value !== null)
    .join(" ")

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>Sleeper league ID</Label>
        <Input
          id={id}
          name="leagueId"
          inputMode="numeric"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={20}
          value={draft}
          aria-invalid={state.status === "error" && message ? true : undefined}
          aria-describedby={describedBy || undefined}
          onChange={(event) => {
            setDraft(event.target.value)
            setHideMessage(true)
          }}
          className="h-11 text-base md:text-base"
        />
      </div>
      {showFallbackNote ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          Using the site league id until you save one.
        </p>
      ) : null}
      {message ? (
        <p
          id={messageId}
          role="status"
          className={cn(
            "text-sm",
            state.status === "error"
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {message}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending} className="h-11 w-fit md:h-9">
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  )
}

export const ProfileMenu: FC<ProfileMenuProps> = ({
  email,
  displayName,
  leagueId,
  signedIn,
  hasEnvLeagueId,
  supabaseAvailable,
}) => {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="size-11 md:size-9">
          <User />
          <span className="sr-only">Open account</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="gap-0">
        <SheetHeader className="border-b border-border pr-12">
          <SheetTitle className="font-display text-2xl leading-none font-semibold">
            Account
          </SheetTitle>
          <SheetDescription className="sr-only">
            Account details, theme, and Sleeper league id.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
          <section className="flex flex-col items-start gap-3">
            {signedIn ? (
              <>
                {displayName || email ? (
                  <div className="flex flex-col gap-1">
                    {displayName ? (
                      <p className="text-sm font-medium">{displayName}</p>
                    ) : null}
                    {email ? (
                      <p className="text-sm break-all text-muted-foreground">
                        {email}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <form action={signOutAction}>
                  <Button
                    type="submit"
                    variant="outline"
                    className="h-11 md:h-9"
                  >
                    Sign out
                  </Button>
                </form>
              </>
            ) : (
              <>
                <SignInLink />
                {supabaseAvailable ? null : (
                  <p className="text-sm text-muted-foreground">
                    Accounts are unavailable right now, so a league id cannot be
                    saved.
                  </p>
                )}
              </>
            )}
          </section>
          <Separator />
          <section className="flex flex-col items-start gap-3">
            <h2 className="font-display text-lg leading-none font-semibold">
              Appearance
            </h2>
            <ThemeToggle />
          </section>
          {signedIn ? (
            <>
              <Separator />
              <section className="flex flex-col gap-3">
                <h2 className="font-display text-lg leading-none font-semibold">
                  League
                </h2>
                <LeagueForm
                  leagueId={leagueId}
                  hasEnvLeagueId={hasEnvLeagueId}
                />
              </section>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
