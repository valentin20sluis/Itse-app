import { buscarObservacion } from "@/modules/inspecciones/constants/observaciones-no-relevantes";
import type { TipoItse } from "@/modules/inspecciones/utils/plazo-subsanacion";

export type EvaluacionObservaciones =
  | { ok: true }
  | { ok: false; motivo: "sin_observaciones" | "codigo_invalido" | "relevante" };

export function evaluarObservaciones(
  tipo: TipoItse,
  { codigos, libres }: { codigos: readonly string[]; libres: readonly string[] },
): EvaluacionObservaciones {
  if (codigos.length === 0 && libres.length === 0) return { ok: false, motivo: "sin_observaciones" };
  if (codigos.some((c) => !buscarObservacion(c)) || new Set(codigos).size !== codigos.length) {
    return { ok: false, motivo: "codigo_invalido" };
  }
  // En posterior lo que no está en el catálogo es relevante (reglas-negocio 7.4).
  if (tipo === "POSTERIOR" && libres.length > 0) return { ok: false, motivo: "relevante" };
  return { ok: true };
}
