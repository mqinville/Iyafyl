export interface NavLink {
  label: string
  href: string
}

export interface NavGroup {
  label: string
  href: string
  children: readonly NavLink[]
}

export type NavItem = NavLink | NavGroup

export function isNavGroup(item: NavItem): item is NavGroup {
  return "children" in item
}

export const navItems: readonly NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "Teams",
    href: "/teams#teams",
    children: [
      { label: "Teams", href: "/teams#teams" },
      { label: "Standings", href: "/teams#standings" },
      { label: "Matchups", href: "/teams#matchups" },
    ],
  },
  { label: "Trade Calculator", href: "/trade-calculator" },
  { label: "Rankings", href: "/rankings" },
  { label: "Hall of Fame", href: "/hall-of-fame" },
]
