import type { Role } from "@/modules/usuarios/types/user.types";

export const ROLE_LABELS: Record<Role, string> = {
  cliente: "Cliente",
  admin: "Admin",
  superadmin: "Jefe GRDyDC",
};
