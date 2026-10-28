import { UsuariosView } from "@/modules/usuarios/components/UsuariosView";
import { parseUsuarioFiltros } from "@/modules/usuarios/schemas/usuario-filtros.schema";
import { requireRole } from "@/modules/usuarios/services/authorization.service";
import { listUsuarios } from "@/modules/usuarios/services/usuario-admin.service";

export const metadata = { title: "Usuarios" };

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireRole("superadmin");
  const filtros = parseUsuarioFiltros(await searchParams);
  const datos = await listUsuarios(actor, filtros);

  return <UsuariosView datos={datos} filtros={filtros} />;
}
