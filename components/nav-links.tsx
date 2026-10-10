"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, type FC } from "react"
import { navLinkClass, navTextClass } from "@/lib/link-classes"
import { isNavGroup, navItems, type NavLink } from "@/lib/nav"
import { cn } from "@/lib/utils"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"

interface NavLinksProps {
  orientation?: "horizontal" | "vertical"
  onNavigate?: () => void
  className?: string
}

function pathOf(href: string): string {
  return href.split("#")[0] ?? href
}

function hashOf(href: string): string {
  const hash = href.split("#")[1]
  return hash ? `#${hash}` : ""
}

function isPageActive(href: string, pathname: string): boolean {
  const path = pathOf(href)
  if (path === "/") {
    return pathname === "/"
  }
  return pathname === path || pathname.startsWith(`${path}/`)
}

function isSectionActive(
  href: string,
  pathname: string,
  hash: string,
): boolean {
  if (pathOf(href) !== pathname) {
    return false
  }
  const section = hashOf(href)
  if (section === "#teams") {
    return hash === "" || hash === "#teams"
  }
  return hash === section
}

function menuLinkClass(active: boolean): string {
  return cn(
    "flex min-h-11 items-center rounded-sm px-2.5",
    navLinkClass(active),
    "hover:bg-muted focus:bg-muted",
  )
}

function triggerClass(active: boolean): string {
  return cn(
    navTextClass,
    navLinkClass(active),
    "h-auto rounded-none bg-transparent px-0 py-0 font-normal hover:bg-transparent focus:bg-transparent data-open:bg-transparent data-open:hover:bg-transparent data-popup-open:bg-transparent data-popup-open:hover:bg-transparent",
    active && "font-semibold",
  )
}

interface MenuLinkProps {
  item: NavLink
  active: boolean
  onNavigate?: () => void
  className?: string
}

const MenuLink: FC<MenuLinkProps> = ({
  item,
  active,
  onNavigate,
  className,
}) => {
  return (
    <NavigationMenuLink asChild active={active}>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={className}
      >
        {item.label}
      </Link>
    </NavigationMenuLink>
  )
}

export const NavLinks: FC<NavLinksProps> = ({
  orientation = "horizontal",
  onNavigate,
  className,
}) => {
  const pathname = usePathname()
  const [hash, setHash] = useState("")

  useEffect(() => {
    const read = () => {
      setHash(window.location.hash)
    }
    read()
    window.addEventListener("hashchange", read)
    return () => {
      window.removeEventListener("hashchange", read)
    }
  }, [pathname])

  if (orientation === "vertical") {
    return (
      <nav
        aria-label="Main"
        className={cn("flex flex-col text-base", className)}
      >
        {navItems.map((item) => {
          if (!isNavGroup(item)) {
            const active = isPageActive(item.href, pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center",
                  navLinkClass(active),
                )}
              >
                {item.label}
              </Link>
            )
          }

          return (
            <div key={item.label} className="flex flex-col">
              {item.children.map((child) => {
                const active = isSectionActive(child.href, pathname, hash)
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={onNavigate}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex min-h-11 items-center",
                      child.href === item.href ? "" : "pl-4",
                      navLinkClass(active),
                    )}
                  >
                    {child.label}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>
    )
  }

  return (
    <NavigationMenu
      viewport={false}
      activationMode="manual"
      aria-label="Main"
      className={cn(
        "max-w-none flex-none justify-start",
        navTextClass,
        className,
      )}
    >
      <NavigationMenuList className="gap-[30px]">
        {navItems.map((item) => {
          if (!isNavGroup(item)) {
            const active = isPageActive(item.href, pathname)
            return (
              <NavigationMenuItem key={item.href}>
                <MenuLink
                  item={item}
                  active={active}
                  onNavigate={onNavigate}
                  className={cn(
                    navTextClass,
                    navLinkClass(active),
                    "bg-transparent p-0 hover:bg-transparent",
                  )}
                />
              </NavigationMenuItem>
            )
          }

          const active = isPageActive(item.href, pathname)
          return (
            <NavigationMenuItem key={item.label}>
              <NavigationMenuTrigger
                className={triggerClass(active)}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-40">
                  {item.children.map((child) => {
                    const current = isSectionActive(child.href, pathname, hash)
                    return (
                      <li key={child.href}>
                        <MenuLink
                          item={child}
                          active={current}
                          onNavigate={onNavigate}
                          className={menuLinkClass(current)}
                        />
                      </li>
                    )
                  })}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          )
        })}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
