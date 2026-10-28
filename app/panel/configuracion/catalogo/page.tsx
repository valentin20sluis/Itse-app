import { CatalogoView } from "@/modules/configuracion/components/CatalogoView";
import { listAuditoria } from "@/modules/configuracion/services/auditoria-configuracion.service";
import { listCatalogoCompleto } from "@/modules/configuracion/services/catalogo-lectura.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export const metadata = { title: "Catálogo de observaciones" };

export default async function CatalogoPage() {
  const actor = await requireRole("superadmin");
  const [items, historial] = await Promise.all([listCatalogoCompleto(actor), listAuditoria(actor, "OBSERVACION")]);
  return <CatalogoView items={items} historial={historial} />;
}
