import { notFound } from "next/navigation";
import { z } from "zod";
import { UsuarioDetalleView } from "@/modules/usuarios/components/UsuarioDetalleView";
import { requireRole } from "@/modules/usuarios/services/authorization.service";
import { getUsuarioDetalle } from "@/modules/usuarios/services/usuario-admin.service";

export const metadata = { title: "Detalle de usuario" };

export default async function UsuarioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireRole("superadmin");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const usuario = await getUsuarioDetalle(actor, id);
  if (!usuario) notFound();

  return <UsuarioDetalleView usuario={usuario} />;
}
