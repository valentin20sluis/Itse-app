import { PageHeader } from "@/components/shared/PageHeader";
import { TasasForm } from "@/modules/configuracion/components/TasasForm";
import { listAuditoria } from "@/modules/configuracion/services/auditoria-configuracion.service";
import { listTasas } from "@/modules/configuracion/services/tasa-gestion.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export const metadata = { title: "Tasa de pago" };

export default async function TasasPage() {
  const actor = await requireRole("superadmin");
  const [tasas, historial] = await Promise.all([listTasas(actor), listAuditoria(actor, "TASA")]);
  return (
    <div className="min-w-0">
      <PageHeader
        title="Tasa de pago"
        description="Monto que paga el administrado al presentar su solicitud, según el tipo de inspección."
      />
      <TasasForm tasas={tasas} historial={historial} />
    </div>
  );
}
