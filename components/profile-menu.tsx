"use client"

import { User } from "lucide-react"
import { useState, type FC } from "react"
import { SignInLink } from "@/components/auth/sign-in-link"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
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

interface ProfileMenuProps {
  email: string | null
  displayName: string | null
  signedIn: boolean
}

export const ProfileMenu: FC<ProfileMenuProps> = ({
  email,
  displayName,
  signedIn,
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
            Account details and theme.
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
              <SignInLink />
            )}
          </section>
          <Separator />
          <section className="flex flex-col items-start gap-3">
            <h2 className="font-display text-lg leading-none font-semibold">
              Appearance
            </h2>
            <ThemeToggle />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
