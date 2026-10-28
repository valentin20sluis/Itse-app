import { notFound } from "next/navigation";
import { z } from "zod";

import { ExpedienteDetalleCliente } from "@/modules/expedientes/components/ExpedienteDetalleCliente";
import { getExpedienteDetalle } from "@/modules/expedientes/services/bandeja.service";
import { getResumenInspeccion } from "@/modules/inspecciones/services/designacion.service";
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

  const inspeccion = await getResumenInspeccion(usuario, id);

  return <ExpedienteDetalleCliente detalle={detalle} inspeccion={inspeccion} />;
}
