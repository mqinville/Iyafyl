"use client"

import { Menu, X } from "lucide-react"
import { useState, type FC } from "react"
import { NavLinks } from "@/components/nav-links"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export const MobileNav: FC = () => {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="size-11 md:hidden">
          <Menu />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" showCloseButton={false}>
        <SheetClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 size-11"
          >
            <X />
            <span className="sr-only">Close menu</span>
          </Button>
        </SheetClose>
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <NavLinks
          orientation="vertical"
          onNavigate={() => setOpen(false)}
          className="px-6 pt-14"
        />
      </SheetContent>
    </Sheet>
  )
}
