import { ConfiguracionView } from "@/modules/configuracion/components/ConfiguracionView";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export const metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  await requireRole("superadmin");
  return <ConfiguracionView />;
}
