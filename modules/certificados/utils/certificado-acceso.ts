import type { EstadoExpediente } from "@/modules/expedientes/constants/estado-labels";
import type { Role } from "@/modules/usuarios/types/user.types";

// Aplica al PDF del certificado y a la Resolución: el cliente solo los ve cuando el admin los envió.
export function certificadoDescargable(rol: Role, estado: EstadoExpediente): boolean {
  if (rol === "cliente") return estado === "ENTREGADO";
  return estado === "FINALIZADO" || estado === "ENTREGADO";
}
