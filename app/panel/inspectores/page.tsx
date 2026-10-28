import { InspectoresView } from "@/modules/inspecciones/components/InspectoresView";
import { listInspectores } from "@/modules/inspecciones/services/inspector.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export const metadata = { title: "Inspectores" };

export default async function InspectoresPage() {
  const usuario = await requireRole("admin", "superadmin");
  const inspectores = await listInspectores(usuario);

  return <InspectoresView inspectores={inspectores} />;
}
