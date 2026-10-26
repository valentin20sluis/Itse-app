import Image from "next/image";
import { CalendarClock, FileCheck2, ShieldCheck, Siren } from "lucide-react";

import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";

const highlights = [
  { icon: ShieldCheck, title: "Seguridad de tu negocio", text: "Protege a tus clientes, trabajadores y tu local." },
  { icon: FileCheck2, title: "Requisito para la licencia", text: "Sin el certificado no puedes obtener tu licencia de funcionamiento." },
  { icon: CalendarClock, title: "Vigencia de 2 años", text: "Después debes renovarlo para seguir operando." },
  { icon: Siren, title: "Prevención de riesgos", text: "Detecta a tiempo problemas que pueden causar accidentes." },
];

export function WhatIsItseSection() {
  return (
    <section id="que-es-la-itse" className="scroll-mt-20 bg-background py-16">
      <Reveal className="mx-auto max-w-6xl px-4">
        <SectionHeader
          title="¿Qué es la ITSE?"
          subtitle="Es una inspección de seguridad que se exige para obtener la licencia de funcionamiento de tu negocio. Al aprobarla recibes un certificado con vigencia de 2 años."
        />
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl">
            <Image
              src="/images/landing/que-es-itse.jpg"
              alt="Letrero verde de salida de emergencia colgado del techo de un local"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {highlights.map(({ icon: Icon, title, text }) => (
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
        </div>
      </Reveal>
    </section>
  );
}
