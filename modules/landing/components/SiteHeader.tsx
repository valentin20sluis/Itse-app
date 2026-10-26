import Link from "next/link"
import { Logo } from "@/components/shared/Logo"
import { buttonVariants } from "@/components/ui/button"
import { MobileNav } from "@/modules/landing/components/MobileNav"
import { NAV_LINKS } from "@/modules/landing/constants/nav-links"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="SIGITSE, inicio">
          <Logo />
        </Link>
        <nav
          aria-label="Principal"
          className="hidden items-center gap-6 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/sign-in"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Iniciar sesión
          </Link>
          <Link
            href="/sign-up"
            className={buttonVariants({
              size: "lg",
              className:
                "bg-safety text-safety-foreground hover:bg-safety/90",
            })}
          >
            Crear cuenta
          </Link>
        </div>
        <MobileNav />
      </div>
    </header>
  )
}
