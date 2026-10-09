export interface NavItem {
  label: string
  href: string
}

export const navItems: readonly NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Standings", href: "/standings" },
  { label: "Teams", href: "/teams" },
  { label: "Matchups", href: "/matchups" },
  { label: "Trade Calculator", href: "/trade-calculator" },
  { label: "Rankings", href: "/rankings" },
  { label: "Hall of Fame", href: "/hall-of-fame" },
]
