import { FeriadosView } from "@/modules/configuracion/components/FeriadosView";
import { listAuditoria } from "@/modules/configuracion/services/auditoria-configuracion.service";
import { listFeriados } from "@/modules/configuracion/services/feriado-gestion.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export const metadata = { title: "Feriados" };

export default async function FeriadosPage() {
  const actor = await requireRole("superadmin");
  const [feriados, historial] = await Promise.all([listFeriados(actor), listAuditoria(actor, "FERIADO")]);
  return <FeriadosView feriados={feriados} historial={historial} />;
}
