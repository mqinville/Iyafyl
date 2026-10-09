import type { FC } from "react"
import { Button } from "@/components/ui/button"
import { signOutAction } from "@/lib/server/auth-actions"
import { navTextClass } from "@/lib/link-classes"
import { cn } from "@/lib/utils"

interface UserMenuProps {
  email: string
}

export const UserMenu: FC<UserMenuProps> = ({ email }) => {
  return (
    <div className="flex items-center gap-3">
      <span
        title={email}
        className={cn(
          "hidden max-w-40 truncate text-muted-foreground sm:inline",
          navTextClass
        )}
      >
        {email}
      </span>
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  )
}
