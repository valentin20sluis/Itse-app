import Link from "next/link";
import { FileX } from "lucide-react";
import { BarsChart } from "@/components/shared/BarsChart";
import { ChartCard } from "@/components/shared/ChartCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RIESGO_LABELS, TIPO_TRAMITE_LABELS } from "@/modules/expedientes/constants/expediente-labels";
import { FiltrosReporteForm } from "@/modules/reportes/components/FiltrosReporteForm";
import { TiemposEtapaTabla } from "@/modules/reportes/components/TiemposEtapaTabla";
import type { FiltrosReporte } from "@/modules/reportes/schemas/filtros-reporte.schema";
import { MAX_FILAS_CSV, type Reporte } from "@/modules/reportes/types/reporte.types";
import { etiquetaMes } from "@/modules/reportes/utils/rango-fechas";

type Dato = { label: string; value: number };

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const suma = (datos: Dato[]) => datos.reduce((s, d) => s + d.value, 0);
const masFrecuente = (datos: Dato[]) => datos.reduce((a, b) => (b.value > a.value ? b : a));
const fecha = (iso: string) => iso.split("-").reverse().join("/");

function resumenMeses(datos: Dato[]): string {
  const top = masFrecuente(datos);
  return `Se presentaron ${plural(suma(datos), "expediente", "expedientes")} en ${plural(datos.length, "mes", "meses")}; el mes con más es ${top.label} (${top.value}).`;
}

function resumenCategorias(datos: Dato[], sujeto: string): string {
  const top = masFrecuente(datos);
  return `${sujeto}: ${datos.map((d) => `${d.label} ${d.value}`).join(", ")}. El más frecuente es ${top.label}.`;
}

function resumenResultados(r: Reporte["resultados"]): string {
  return `${plural(r.cumple, "expediente cumple", "expedientes cumplen")}, ${r.noCumple} no cumplen y ${r.subsanacion} pasaron por subsanación. Las categorías no son excluyentes: un expediente puede pasar por subsanación y luego cumplir.`;
}

function resumenCertificados(c: Reporte["certificados"]["vencimiento"]): string {
  return `Hay ${plural(c.vencidos, "certificado vencido", "certificados vencidos")}, ${c.hasta30} vencen en 30 días o menos, ${c.de31a60} vencen entre 31 y 60 días y ${c.vigentes} están vigentes.`;
}

type Props = { reporte: Reporte; filtros: FiltrosReporte };

export function ReportesView({ reporte, filtros }: Props) {
  const meses = reporte.produccion.map((f) => ({ label: etiquetaMes(f.clave), value: f.cantidad }));
  const total = suma(meses);
  const riesgos = reporte.porRiesgo.map((f) => ({
    label: f.riesgo ? RIESGO_LABELS[f.riesgo] : "Sin clasificar",
    value: f.cantidad,
  }));
  const tramites = reporte.porTramite.map((f) => ({ label: TIPO_TRAMITE_LABELS[f.tramite], value: f.cantidad }));
  const r = reporte.resultados;
  const resultados = [
    { label: "Cumplen", value: r.cumple, token: 3 as const },
    { label: "No cumplen", value: r.noCumple, token: 5 as const },
    { label: "Pasaron por subsanación", value: r.subsanacion, token: 4 as const },
  ];
  const c = reporte.certificados.vencimiento;
  const vencimientos = [
    { label: "Vencidos", value: c.vencidos, token: 5 as const },
    { label: "Vencen en 30 días o menos", value: c.hasta30, token: 4 as const },
    { label: "Vencen entre 31 y 60 días", value: c.de31a60, token: 2 as const },
    { label: "Vigentes", value: c.vigentes, token: 3 as const },
  ];

  return (
    <div className="min-w-0">
      <PageHeader
        title="Reportes"
        description={`Expedientes presentados del ${fecha(filtros.desde)} al ${fecha(filtros.hasta)}.`}
      />
      <FiltrosReporteForm filtros={filtros} distritos={reporte.distritos} />

      {total === 0 ? (
        <EmptyState icon={<FileX aria-hidden="true" />} title="No hay expedientes con estos filtros." />
      ) : (
        <div className="flex flex-col gap-4">
          {total > MAX_FILAS_CSV && (
            <p role="status" className="text-sm text-muted-foreground">
              El archivo incluye los primeros {MAX_FILAS_CSV} expedientes; acota las fechas para ver el resto.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="min-w-0 xl:col-span-2">
              <ChartCard title="Expedientes presentados por mes" summary={resumenMeses(meses)} data={meses} valueHeader="Expedientes">
                <BarsChart data={meses} orientation="vertical" valueLabel="Expedientes" />
              </ChartCard>
            </div>
            <div className="min-w-0">
              <ChartCard
                title="Por nivel de riesgo"
                summary={resumenCategorias(riesgos, "Expedientes por nivel de riesgo")}
                data={riesgos}
                valueHeader="Expedientes"
              >
                <BarsChart data={riesgos} valueLabel="Expedientes" />
              </ChartCard>
            </div>
            <div className="min-w-0">
              <ChartCard
                title="Por tipo de trámite"
                summary={resumenCategorias(tramites, "Expedientes por tipo de trámite")}
                data={tramites}
                valueHeader="Expedientes"
              >
                <BarsChart data={tramites} valueLabel="Expedientes" />
              </ChartCard>
            </div>
            <div className="min-w-0 xl:col-span-2">
              <ChartCard
                title="Resultados de inspección"
                summary={resumenResultados(r)}
                data={resultados}
                valueHeader="Expedientes"
              >
                <BarsChart data={resultados} valueLabel="Expedientes" />
              </ChartCard>
            </div>
          </div>

          <Card>
            <CardContent>
              <section aria-labelledby="titulo-tiempos" className="flex min-w-0 flex-col gap-3">
                <h2 id="titulo-tiempos" className="text-base font-medium">
                  Tiempos por etapa
                </h2>
                <TiemposEtapaTabla tiempos={reporte.tiempos} tiempoEntrega={reporte.tiempoEntrega} />
              </section>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <section aria-labelledby="titulo-certificados" className="flex min-w-0 flex-col gap-3">
                <h2 id="titulo-certificados" className="text-base font-medium">
                  Certificados
                </h2>
                <p className="text-sm">
                  <span className="font-medium">Emitidos en el periodo: </span>
                  {reporte.certificados.emitidos}
                </p>
              </section>
            </CardContent>
          </Card>
          <ChartCard
            title="Certificados por vencimiento"
            summary={resumenCertificados(c)}
            data={vencimientos}
            valueHeader="Certificados"
          >
            <BarsChart data={vencimientos} valueLabel="Certificados" />
          </ChartCard>
          <Link
            href="/panel/certificados?filtro=por-vencer"
            className={buttonVariants({ variant: "outline", className: "min-h-11 self-start" })}
          >
            Ver certificados por vencer
          </Link>
        </div>
      )}
    </div>
  );
}
