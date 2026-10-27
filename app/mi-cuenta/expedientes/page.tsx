import { ExpedientesView } from "@/modules/expedientes/components/ExpedientesView";
import { listOwnExpedientes } from "@/modules/expedientes/services/expediente.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export default async function ExpedientesPage() {
  const usuario = await requireRole("cliente");
  const expedientes = await listOwnExpedientes(usuario);

  return <ExpedientesView expedientes={expedientes} />;
}
