import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/shared/PageHeader";
import { AccionesExpediente } from "@/modules/expedientes/components/AccionesExpediente";
import { EstadoBadge } from "@/modules/expedientes/components/EstadoBadge";
import { ExpedienteDatos } from "@/modules/expedientes/components/ExpedienteDatos";
import { HistorialTimeline } from "@/modules/expedientes/components/HistorialTimeline";
import { getExpedienteDetalle } from "@/modules/expedientes/services/bandeja.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export const metadata = { title: "Detalle del expediente" };

export default async function ExpedienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await requireRole("admin", "superadmin");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const detalle = await getExpedienteDetalle(usuario, id);
  if (!detalle) notFound();

  const { expediente } = detalle;

  return (
    <div className="min-w-0">
      <PageHeader title={`Expediente ${expediente.numero}`} />
      <div className="mb-6 -mt-4">
        <EstadoBadge estado={expediente.estado} />
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <ExpedienteDatos detalle={detalle} />
        <section
          aria-labelledby="historial-titulo"
          className="flex flex-col gap-3"
        >
          <h2
            id="historial-titulo"
            className="font-heading text-base font-medium"
          >
            Historial
          </h2>
          <HistorialTimeline historial={detalle.historial} />
        </section>
        <AccionesExpediente
          expedienteId={expediente.id}
          estado={expediente.estado}
          rol={usuario.rol}
          nivelRiesgo={expediente.nivelRiesgo}
        />
      </div>
    </div>
  );
}
