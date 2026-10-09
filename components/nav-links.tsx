"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { FC } from "react"
import { navItems } from "@/lib/nav"
import { cn } from "@/lib/utils"

interface NavLinksProps {
  orientation?: "horizontal" | "vertical"
  onNavigate?: () => void
  className?: string
}

export const NavLinks: FC<NavLinksProps> = ({
  orientation = "horizontal",
  onNavigate,
  className,
}) => {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className={cn(
        orientation === "horizontal"
          ? "flex gap-[30px] text-[13px]"
          : "flex flex-col text-base",
        className
      )}
    >
      {navItems.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              orientation === "vertical" && "flex min-h-11 items-center",
              "transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
              active
                ? "font-semibold text-foreground"
                : "text-muted-foreground"
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
