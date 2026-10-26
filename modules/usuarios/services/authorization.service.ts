import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/modules/usuarios/services/user.service";
import type { Role, Usuario } from "@/modules/usuarios/types/user.types";
import { getHomeForRole } from "@/modules/usuarios/utils/role-routes";

export async function requireRole(...roles: Role[]): Promise<Usuario> {
  const usuario = await getOrCreateUser();
  if (!usuario) redirect("/sign-in");
  if (!usuario.activo) redirect("/cuenta-desactivada");
  if (!roles.includes(usuario.rol)) redirect(getHomeForRole(usuario.rol));
  return usuario;
}
