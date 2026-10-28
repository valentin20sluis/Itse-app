import { ROLE_LABELS } from "@/modules/navigation/constants/role-labels";
import { roleSchema } from "@/modules/usuarios/schemas/role.schema";
import type { AuditoriaItem } from "@/modules/usuarios/types/usuario-admin.types";

function etiquetaRol(valor: string | null): string {
  const rol = roleSchema.safeParse(valor);
  return rol.success ? ROLE_LABELS[rol.data] : "—";
}

export function describirCambio(
  item: Pick<AuditoriaItem, "accion" | "valorAnterior" | "valorNuevo">,
): string {
  switch (item.accion) {
    case "CAMBIO_ROL":
      return `Rol: ${etiquetaRol(item.valorAnterior)} → ${etiquetaRol(item.valorNuevo)}`;
    case "ACTIVACION":
      return "Cuenta reactivada";
    case "DESACTIVACION":
      return "Cuenta desactivada";
    default:
      return "Cambio en la cuenta";
  }
}
