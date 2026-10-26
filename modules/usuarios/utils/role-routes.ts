import type { Role } from "@/modules/usuarios/types/user.types";

export function getHomeForRole(rol: Role): string {
  return rol === "cliente" ? "/mi-cuenta" : "/panel";
}
