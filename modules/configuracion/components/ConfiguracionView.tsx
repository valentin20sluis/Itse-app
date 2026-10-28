import Link from "next/link";
import { CalendarDays, ChevronRight, ClipboardList, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DIAS_ALERTA_VENCIMIENTO, VIGENCIA_ANIOS } from "@/modules/certificados/utils/vigencia";
import { plazoSubsanacionDias } from "@/modules/inspecciones/utils/plazo-subsanacion";

type Seccion = { titulo: string; descripcion: string; href: string; icono: LucideIcon };

const SECCIONES: Seccion[] = [
  {
    titulo: "Feriados",
    descripcion: "Días que no cuentan en los plazos de subsanación.",
    href: "/panel/configuracion/feriados",
    icono: CalendarDays,
  },
  {
    titulo: "Catálogo de observaciones",
    descripcion: "Observaciones no relevantes que se ofrecen al registrar una inspección.",
    href: "/panel/configuracion/catalogo",
    icono: ClipboardList,
  },
];

const REGLAS_FIJAS = [
  { titulo: "Vigencia del certificado", valor: `${VIGENCIA_ANIOS} años`, base: "Ley 30619" },
  {
    titulo: "Plazo para subsanar",
    valor: `${plazoSubsanacionDias("POSTERIOR")} días hábiles en ITSE posterior y ${plazoSubsanacionDias("PREVIA")} en ITSE previa`,
    base: "DS 002-2018-PCM",
  },
  { titulo: "Aviso de renovación", valor: `${DIAS_ALERTA_VENCIMIENTO} días antes del vencimiento`, base: "Regla del sistema" },
];

export function ConfiguracionView() {
  return (
    <div className="min-w-0">
      <PageHeader
        title="Configuración"
        description="Datos de la municipalidad que el sistema usa en el trámite."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SECCIONES.map(({ titulo, descripcion, href, icono: Icono }) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icono className="size-5 text-brand" aria-hidden="true" />
                  {titulo}
                  <ChevronRight className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
                </CardTitle>
                <CardDescription>{descripcion}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <section aria-labelledby="reglas-fijas" className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle id="reglas-fijas">Reglas fijas por norma</CardTitle>
            <CardDescription>
              Las fija la ley y no se pueden cambiar desde el sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
              {REGLAS_FIJAS.map((r) => (
                <div key={r.titulo} className="flex flex-col gap-0.5">
                  <dt className="text-muted-foreground">{r.titulo}</dt>
                  <dd className="font-medium">{r.valor}</dd>
                  <dd className="text-muted-foreground">{r.base}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
