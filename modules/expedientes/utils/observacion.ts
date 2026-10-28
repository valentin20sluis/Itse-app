import type { HistorialItem } from "@/modules/expedientes/types/bandeja.types";

export function ultimaObservacion(historial: readonly HistorialItem[]): string | null {
  const ultima = historial
    .filter((h) => h.estadoNuevo === "OBSERVADO_REQUISITOS")
    .reduce<HistorialItem | null>(
      (a, h) => (!a || h.createdAt.getTime() > a.createdAt.getTime() ? h : a),
      null,
    );
  return ultima?.comentario?.trim() || null;
}
