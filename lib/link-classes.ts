import { cn } from "@/lib/utils"

// Desktop header nav text size, shared by the nav links and the sign-in link.
export const navTextClass = "text-[13px]"

export function navLinkClass(active: boolean): string {
  return cn(
    "whitespace-nowrap transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
    active ? "font-semibold text-foreground" : "text-muted-foreground",
  )
}

export const brandLinkClass =
  "font-semibold text-brand-text transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"

// Pill-shaped segmented ToggleGroup (wrapper + item), shared by the rankings
// filters and the trade calculator board switch.
export const segmentedGroupClass =
  "rounded-full border border-border bg-card p-0.5"

export const segmentedItemClass =
  "h-10 cursor-pointer rounded-full text-xs font-semibold text-muted-foreground data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:hover:bg-foreground data-[state=on]:hover:text-background sm:h-8"
