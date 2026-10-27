import type { NivelRiesgo } from "@/modules/expedientes/types/expediente.types";

export const MONEDA = "pen";

export const MONTO_TASA_BAJO_MEDIO = 15000;
export const MONTO_TASA_ALTO_MUY_ALTO = 30000;

/** Monto ficticio de la tasa, en céntimos. */
export function montoTasa(nivel: NivelRiesgo): number {
  return nivel === "BAJO" || nivel === "MEDIO" ? MONTO_TASA_BAJO_MEDIO : MONTO_TASA_ALTO_MUY_ALTO;
}
