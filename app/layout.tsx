import type { Metadata } from "next"
import type { FC, ReactNode } from "react"
import { SiteHeader } from "@/components/site-header"
import { TooltipProvider } from "@/components/ui/tooltip"
import { themeScript } from "@/lib/theme"
import "./globals.css"

export const metadata: Metadata = {
  title: { default: "IYAFYL · Fantasy football league", template: "%s | IYAFYL" },
  description:
    "If Ya Ain't First, You're Last: a 12-team full-PPR redraft league since 2019.",
}

interface RootLayoutProps {
  children: ReactNode
}

const RootLayout: FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a
          href="#main"
          // Overlays the lead story's empty top padding, below the header, so it
          // covers nothing and causes no layout shift when focused
          className="sr-only focus:not-sr-only focus:fixed focus:top-24 focus:left-1/2 focus:z-50 focus:-translate-x-1/2 focus:rounded-[5px] focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Skip to content
        </a>
        <TooltipProvider>
          <SiteHeader />
          {children}
        </TooltipProvider>
      </body>
    </html>
  )
}

export default RootLayout
