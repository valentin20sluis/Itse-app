"use client"

import { useState } from "react"
import Link from "next/link"
import { MenuIcon } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { NAV_LINKS } from "@/modules/landing/constants/nav-links"

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11 md:hidden"
            aria-label="Abrir menú"
          />
        }
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Menú</SheetTitle>
          <SheetDescription className="sr-only">
            Navegación principal
          </SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={close}
              className="rounded-lg px-2 py-2 text-base font-medium hover:bg-muted"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 p-4">
          <Link
            href="/sign-in"
            onClick={close}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Iniciar sesión
          </Link>
          <Link
            href="/sign-up"
            onClick={close}
            className={buttonVariants({
              size: "lg",
              className:
                "bg-safety text-safety-foreground hover:bg-safety/90",
            })}
          >
            Crear cuenta
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
