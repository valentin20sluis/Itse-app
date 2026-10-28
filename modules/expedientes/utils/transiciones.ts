import { ESTADO_LABELS, type EstadoExpediente } from "@/modules/expedientes/constants/estado-labels";
import type { Role } from "@/modules/usuarios/types/user.types";

export const ESTADOS_FINALES: readonly EstadoExpediente[] = [
  "ANULADO",
  "ENTREGADO",
  "DERIVADO_COMERCIALIZACION",
];

const ESTADOS = Object.keys(ESTADO_LABELS) as EstadoExpediente[];

const FLUJO: Partial<Record<EstadoExpediente, EstadoExpediente[]>> = {
  PRESENTADO: ["EN_REVISION"],
  EN_REVISION: ["OBSERVADO_REQUISITOS", "EN_TRAMITE_EXTERNO"],
};

export const TRANSICIONES: Record<EstadoExpediente, EstadoExpediente[]> = Object.fromEntries(
  ESTADOS.map((estado) => {
    const anulable = estado !== "BORRADOR" && !ESTADOS_FINALES.includes(estado);
    return [estado, [...(FLUJO[estado] ?? []), ...(anulable ? ["ANULADO"] : [])]];
  }),
) as Record<EstadoExpediente, EstadoExpediente[]>;

export function transicionesPermitidas(estado: EstadoExpediente, rol: Role): EstadoExpediente[] {
  if (rol === "cliente") return [];
  return TRANSICIONES[estado].filter((hasta) => hasta !== "ANULADO" || rol === "superadmin");
}

export function puedeTransicionar(
  desde: EstadoExpediente,
  hasta: EstadoExpediente,
  rol: Role,
): boolean {
  return transicionesPermitidas(desde, rol).includes(hasta);
}

export function requiereMotivo(hasta: EstadoExpediente): boolean {
  return hasta === "OBSERVADO_REQUISITOS" || hasta === "ANULADO";
}
