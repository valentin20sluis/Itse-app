import { ReportesView } from "@/modules/reportes/components/ReportesView";
import { filtrosReporteSchema } from "@/modules/reportes/schemas/filtros-reporte.schema";
import { getReporte } from "@/modules/reportes/services/reportes.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export const metadata = { title: "Reportes" };

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await requireRole("admin", "superadmin");
  const filtros = filtrosReporteSchema.parse(await searchParams);
  const reporte = await getReporte(usuario, filtros);

  return <ReportesView reporte={reporte} filtros={filtros} />;
}
