import { PageHeader } from "@/components/shared/PageHeader";
import { requireRole } from "@/modules/usuarios/services/authorization.service";
import { DashboardView } from "@/modules/reportes/components/DashboardView";
import { getDashboardPanel } from "@/modules/reportes/services/dashboard.service";

export default async function PanelPage() {
  const usuario = await requireRole("admin", "superadmin");
  const dashboard = await getDashboardPanel(usuario);

  return (
    <>
      <PageHeader title="Dashboard" description="Resumen de la gestión de expedientes ITSE." />
      <DashboardView dashboard={dashboard} />
    </>
  );
}
