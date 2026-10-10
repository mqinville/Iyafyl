import { LogOut } from "lucide-react"
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
          // Hidden at lg–xl, where the nav tabs and player search fill the row.
          "hidden max-w-40 truncate text-muted-foreground sm:inline lg:hidden 2xl:inline",
          navTextClass,
        )}
      >
        {email}
      </span>
      <form action={signOutAction}>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="size-11 sm:h-8 sm:w-auto"
        >
          <LogOut className="sm:hidden" />
          <span className="sr-only sm:not-sr-only">Sign out</span>
        </Button>
      </form>
    </div>
  )
}
