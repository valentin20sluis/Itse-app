import { ClipboardCheck, Download, FileUp, Search, UserPlus } from "lucide-react";

import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";

const steps = [
  { icon: UserPlus, title: "Crea tu cuenta" },
  { icon: FileUp, title: "Registra tu establecimiento y sube tus documentos" },
  { icon: Search, title: "Revisamos tu expediente" },
  { icon: ClipboardCheck, title: "Inspección en tu local" },
  { icon: Download, title: "Descarga tu certificado" },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-muted py-16">
      <Reveal className="mx-auto max-w-6xl px-4">
        <SectionHeader
          title="¿Cómo funciona?"
          subtitle="Cinco pasos simples, todo desde tu computadora o celular."
        />
        <ol className="flex flex-col gap-8 lg:flex-row lg:gap-4">
          {steps.map(({ icon: Icon, title }, i) => (
            <li
              key={title}
              className="relative flex flex-1 items-start gap-4 lg:flex-col lg:items-center lg:text-center"
            >
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-12 left-6 h-[calc(100%+0.5rem)] w-0.5 bg-brand/30 lg:top-6 lg:left-[calc(50%+2rem)] lg:h-0.5 lg:w-[calc(100%-4rem+1rem)]"
                />
              )}
              <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
                <Icon className="size-6" aria-hidden="true" />
                <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-safety text-xs font-bold text-safety-foreground">
                  {i + 1}
                </span>
              </span>
              <p className="pt-2 font-medium lg:pt-0">{title}</p>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}
