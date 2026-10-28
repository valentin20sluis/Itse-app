import { notFound } from "next/navigation";
import { z } from "zod";

import { getResumenCertificado } from "@/modules/certificados/services/certificado.service";
import { ExpedienteDetalleCliente } from "@/modules/expedientes/components/ExpedienteDetalleCliente";
import { getExpedienteDetalle } from "@/modules/expedientes/services/bandeja.service";
import { getResumenInspeccion } from "@/modules/inspecciones/services/designacion.service";
import { getResumenSubsanacion } from "@/modules/inspecciones/services/diligencia.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export default async function ExpedienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await requireRole("cliente");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const detalle = await getExpedienteDetalle(usuario, id);
  if (!detalle) notFound();

  const [inspeccion, subsanacion, certificado] = await Promise.all([
    getResumenInspeccion(usuario, id),
    getResumenSubsanacion(usuario, id),
    getResumenCertificado(usuario, id),
  ]);

  return (
    <ExpedienteDetalleCliente
      detalle={detalle}
      inspeccion={inspeccion}
      subsanacion={subsanacion}
      certificado={certificado}
    />
  );
}
