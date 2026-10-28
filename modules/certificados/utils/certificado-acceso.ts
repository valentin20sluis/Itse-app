import type { EstadoExpediente } from "@/modules/expedientes/constants/estado-labels";
import type { Role } from "@/modules/usuarios/types/user.types";

// Aplica al PDF del certificado y a la Resolución: el cliente solo los ve cuando el admin los envió.
export function certificadoDescargable(rol: Role, estado: EstadoExpediente): boolean {
  if (rol === "cliente") return estado === "ENTREGADO";
  return estado === "FINALIZADO" || estado === "ENTREGADO";
}

// El PDF del certificado (no la Resolución) además se ve como borrador antes de aprobarlo; solo el personal.
export function certificadoPdfVisible(rol: Role, estado: EstadoExpediente): boolean {
  return certificadoDescargable(rol, estado) || (rol !== "cliente" && estado === "CERTIFICADO_PENDIENTE_FIRMA");
}
