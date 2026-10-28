import { FileX } from "lucide-react";
import { BarsChart } from "@/components/shared/BarsChart";
import { ChartCard } from "@/components/shared/ChartCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ESTADO_LABELS } from "@/modules/expedientes/constants/estado-labels";
import { KpiCard } from "@/modules/reportes/components/KpiCard";
import type { DashboardPanel } from "@/modules/reportes/types/dashboard.types";
import { etiquetaMes } from "@/modules/reportes/utils/rango-fechas";

type Dato = { label: string; value: number };

const masFrecuente = (datos: Dato[]) => datos.reduce((a, b) => (b.value > a.value ? b : a));
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function resumenEstados(datos: Dato[]): string {
  const total = datos.reduce((s, d) => s + d.value, 0);
  const top = masFrecuente(datos);
  return `Hay ${plural(total, "expediente presentado", "expedientes presentados")}; el estado más frecuente es ${top.label} (${top.value}).`;
}

function resumenMeses(datos: Dato[]): string {
  const total = datos.reduce((s, d) => s + d.value, 0);
  if (total === 0) return `No se presentaron solicitudes en los últimos ${datos.length} meses.`;
  const top = masFrecuente(datos);
  return `En los últimos ${datos.length} meses se presentaron ${plural(total, "solicitud", "solicitudes")}; el mes con más es ${top.label} (${top.value}).`;
}

function resumenCertificados(c: DashboardPanel["certificados"]): string {
  return `Hay ${plural(c.vencidos, "certificado vencido", "certificados vencidos")}, ${c.hasta30} vencen en 30 días o menos, ${c.de31a60} vencen entre 31 y 60 días y ${c.vigentes} están vigentes.`;
}

export function DashboardView({ dashboard }: { dashboard: DashboardPanel }) {
  const { indicadores: i, certificados: c } = dashboard;
  const estados = dashboard.porEstado.map((f) => ({ label: ESTADO_LABELS[f.estado].label, value: f.cantidad }));
  const meses = dashboard.porMes.map((f) => ({ label: etiquetaMes(f.clave), value: f.cantidad }));
  const vencimientos = [
    { label: "Vencidos", value: c.vencidos, token: 5 as const },
    { label: "Vencen en 30 días o menos", value: c.hasta30, token: 4 as const },
    { label: "Vencen entre 31 y 60 días", value: c.de31a60, token: 2 as const },
    { label: "Vigentes", value: c.vigentes, token: 3 as const },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
        <KpiCard title="Por revisar" value={i.porRevisar} href="/panel/expedientes?estado=PRESENTADO" />
        <KpiCard title="En revisión" value={i.enRevision} href="/panel/expedientes?estado=EN_REVISION" />
        <KpiCard title="Pendientes de Jefatura" value={i.pendientesJefatura} href="/panel/expedientes?pendientes=jefatura" />
        <KpiCard
          title="Inspecciones en los próximos 7 días"
          value={i.inspeccionesSemana}
          href="/panel/expedientes?estado=DILIGENCIA_PROGRAMADA"
        />
        <KpiCard
          title="Plazos de subsanación por vencer"
          value={i.subsanacionPorVencer}
          href="/panel/expedientes?estado=EN_SUBSANACION"
        />
        <KpiCard
          title="Certificados por vencer"
          value={i.certificadosPorVencer}
          href="/panel/certificados?filtro=por-vencer"
          linkLabel="Ver certificados"
        />
      </div>

      {estados.length === 0 ? (
        <EmptyState icon={<FileX aria-hidden="true" />} title="Aún no hay expedientes presentados." />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="min-w-0 xl:col-span-2">
            <ChartCard title="Expedientes por estado" summary={resumenEstados(estados)} data={estados} valueHeader="Expedientes">
              <BarsChart data={estados} valueLabel="Expedientes" />
            </ChartCard>
          </div>
          <div className="min-w-0">
            <ChartCard title="Solicitudes presentadas por mes" summary={resumenMeses(meses)} data={meses} valueHeader="Solicitudes">
              <BarsChart data={meses} orientation="vertical" valueLabel="Solicitudes" />
            </ChartCard>
          </div>
          <div className="min-w-0">
            <ChartCard
              title="Certificados por vencimiento"
              summary={resumenCertificados(c)}
              data={vencimientos}
              valueHeader="Certificados"
            >
              <BarsChart data={vencimientos} valueLabel="Certificados" />
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
