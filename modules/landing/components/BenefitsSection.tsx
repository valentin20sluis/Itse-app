import { BellRing, FileText, ListChecks, QrCode, Timer } from "lucide-react";

import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";

const benefits = [
  { icon: FileText, title: "Menos papel", text: "Ya no se piden 2 juegos de copias: subes tus archivos digitales." },
  { icon: ListChecks, title: "Seguimiento de tu trámite", text: "Consulta en qué estado está tu trámite en cualquier momento." },
  { icon: Timer, title: "Plazos claros", text: "Conoce las etapas de tu trámite." },
  { icon: BellRing, title: "Alertas de renovación", text: "Te avisamos 60 días antes del vencimiento de tu certificado." },
  { icon: QrCode, title: "Certificado verificable con QR", text: "Cualquier persona puede comprobar que tu certificado es auténtico." },
];

export function BenefitsSection() {
  return (
    <section id="beneficios" className="scroll-mt-20 bg-background py-16">
      <Reveal className="mx-auto max-w-6xl px-4">
        <SectionHeader
          title="Beneficios de hacerlo con SIGITSE"
          subtitle="Un trámite más ordenado, transparente y sin papeleo innecesario."
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <Card className="h-full">
                <CardContent className="flex flex-col gap-2">
                  <Icon className="size-8 text-brand" aria-hidden="true" />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-muted-foreground">{text}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
