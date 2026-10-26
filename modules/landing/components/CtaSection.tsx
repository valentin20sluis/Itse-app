import Link from "next/link"

import { Reveal } from "@/components/shared/Reveal"
import { buttonVariants } from "@/components/ui/button"

export function CtaSection() {
  return (
    <section className="bg-gradient-to-br from-brand to-brand/70 py-16 text-brand-foreground">
      <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Empieza tu trámite hoy</h2>
        <p className="text-brand-foreground/90">
          Crea tu cuenta y gestiona tu Certificado ITSE en línea, paso a paso.
        </p>
        <Link
          href="/sign-up"
          className={buttonVariants({
            size: "lg",
            className: "bg-safety text-safety-foreground hover:bg-safety/90",
          })}
        >
          Crear cuenta
        </Link>
      </Reveal>
    </section>
  )
}
