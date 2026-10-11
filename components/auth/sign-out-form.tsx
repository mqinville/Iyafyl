"use client"

import type { FC, ReactNode } from "react"
import { usePlayerTabs } from "@/components/player-card/player-tabs-provider"

interface SignOutFormProps {
  action: () => void | Promise<void>
  children: ReactNode
}

// Sign-out form that wipes the open player tabs first, so they never leak to
// the next user of a shared browser.
export const SignOutForm: FC<SignOutFormProps> = ({ action, children }) => {
  const { clearPlayers } = usePlayerTabs()

  return (
    <form action={action} onSubmit={clearPlayers}>
      {children}
    </form>
  )
}
