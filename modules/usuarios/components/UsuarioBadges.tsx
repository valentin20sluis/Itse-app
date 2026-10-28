import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/modules/navigation/constants/role-labels";
import type { Role } from "@/modules/usuarios/types/user.types";

export function RolBadge({ rol }: { rol: Role }) {
  return <Badge variant={rol === "cliente" ? "outline" : "secondary"}>{ROLE_LABELS[rol]}</Badge>;
}

export function EstadoBadge({ activo }: { activo: boolean }) {
  return <Badge variant={activo ? "default" : "outline"}>{activo ? "Activo" : "Inactivo"}</Badge>;
}
