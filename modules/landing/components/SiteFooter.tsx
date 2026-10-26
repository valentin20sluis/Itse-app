import { Logo } from "@/components/shared/Logo"
import { NAV_LINKS } from "@/modules/landing/constants/nav-links"

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <Logo />
        <nav aria-label="Enlaces del pie" className="flex flex-col gap-2 text-sm">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <address className="space-y-1 text-sm not-italic text-muted-foreground">
          <p className="font-medium text-foreground">
            Oficina de GRDyDC (datos ficticios)
          </p>
          <p>Av. Ejemplo 123, Ciudad Ficticia</p>
          <p>Teléfono: (01) 555-0100</p>
          <p>Correo: contacto@sigitse.example</p>
          <p>Horario: lunes a viernes, 8:00 a 16:00</p>
        </address>
      </div>
      <p className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
        Proyecto académico. No es un sistema oficial de ninguna municipalidad.
      </p>
    </footer>
  )
}
