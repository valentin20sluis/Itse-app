import type { NivelRiesgo } from "@/modules/expedientes/types/expediente.types";
import { tipoItsePorRiesgo } from "@/modules/expedientes/utils/riesgo";

export const MONEDA = "pen";

/** Monto de la tasa por tipo de ITSE, en céntimos. */
export type Tasas = { POSTERIOR: number; PREVIA: number };

export function montoTasa(nivel: NivelRiesgo, tasas: Tasas): number {
  return tasas[tipoItsePorRiesgo(nivel)];
}
