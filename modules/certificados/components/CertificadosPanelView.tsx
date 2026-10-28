import { Award } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { CertificadoEstadoBadge } from "@/modules/certificados/components/CertificadoEstadoBadge";
import type { FiltroCertificados } from "@/modules/certificados/schemas/filtro-certificados.schema";
import type { CertificadoPanelFila } from "@/modules/certificados/services/certificado-lista.service";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";

const FILTROS: { valor: FiltroCertificados; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "por-vencer", label: "Por vencer" },
  { valor: "vencidos", label: "Vencidos" },
];

const plural = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

function textoDias(dias: number): string {
  if (dias === 0) return "Vence hoy";
  return dias > 0 ? `Faltan ${plural(dias)}` : `Venció hace ${plural(-dias)}`;
}

export function CertificadosPanelView({
  filas,
  filtro,
}: {
  filas: CertificadoPanelFila[];
  filtro: FiltroCertificados;
}) {
  return (
    <div className="min-w-0">
      <PageHeader title="Certificados" description="Certificados emitidos y su vigencia." />
      <nav aria-label="Filtrar certificados" className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={f.valor === "todos" ? "/panel/certificados" : `/panel/certificados?filtro=${f.valor}`}
            aria-current={f.valor === filtro ? "page" : undefined}
            className={buttonVariants({
              variant: f.valor === filtro ? "default" : "outline",
              className: "min-h-11",
            })}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {filas.length === 0 ? (
        <EmptyState icon={<Award />} title="No hay certificados en esta lista." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filas.map((f) => (
            <li key={f.expedienteId} className="min-w-0 rounded-xl border border-border bg-card p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">Certificado N.° {f.numero}</p>
                <CertificadoEstadoBadge estado={f.estado} />
              </div>
              <Link
                href={`/panel/expedientes/${f.expedienteId}`}
                className="mt-1 inline-flex min-h-11 items-center text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                Expediente {f.expedienteNumero}
              </Link>
              <p className="break-words">
                {f.nombreComercial} - {f.distrito}
              </p>
              <p className="mt-2 text-muted-foreground">
                Vence el {formatFecha(f.venceAt)}
                {f.estado !== "REVOCADO" && <> ({textoDias(f.diasRestantes)})</>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
