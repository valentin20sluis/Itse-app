import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/modules/usuarios/services/user.service";
import { getHomeForRole } from "@/modules/usuarios/utils/role-routes";

export default async function PostLoginPage() {
  const user = await getOrCreateUser();
  if (!user) redirect("/sign-in");
  if (!user.activo) redirect("/cuenta-desactivada");
  redirect(getHomeForRole(user.rol));
}
