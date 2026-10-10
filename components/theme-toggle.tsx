"use client"

import { Moon, Sun } from "lucide-react"
import type { FC } from "react"
import { Button } from "@/components/ui/button"
import { THEME_STORAGE_KEY } from "@/lib/theme"

export const ThemeToggle: FC = () => {
  const toggle = () => {
    const dark = document.documentElement.classList.toggle("dark")
    try {
      localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light")
    } catch {
      // Storage can be blocked. The class on <html> still applies for this visit.
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-fit justify-start md:h-9"
      onClick={toggle}
    >
      <Sun className="hidden dark:block" aria-hidden="true" />
      <Moon className="dark:hidden" aria-hidden="true" />
      <span className="dark:hidden">Switch to dark theme</span>
      <span className="hidden dark:inline">Switch to light theme</span>
    </Button>
  )
}
