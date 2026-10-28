import { describe, expect, it } from "vitest";

import type { HistorialItem } from "@/modules/expedientes/types/bandeja.types";
import { ultimaObservacion } from "./observacion";

const item = (
  estadoNuevo: HistorialItem["estadoNuevo"],
  comentario: string | null,
  dia: number,
): HistorialItem => ({
  id: `h-${dia}`,
  estadoAnterior: null,
  estadoNuevo,
  comentario,
  createdAt: new Date(2026, 0, dia),
});

describe("ultimaObservacion", () => {
  it("devuelve el motivo de la observación más reciente aunque el arreglo esté desordenado", () => {
    const historial = [
      item("OBSERVADO_REQUISITOS", "Segunda observación", 10),
      item("PRESENTADO", "Requisitos subsanados y reenviados.", 5),
      item("OBSERVADO_REQUISITOS", "Primera observación", 2),
    ];
    expect(ultimaObservacion(historial)).toBe("Segunda observación");
  });

  it("null sin observaciones", () => {
    expect(ultimaObservacion([item("EN_REVISION", "ok", 1)])).toBeNull();
    expect(ultimaObservacion([])).toBeNull();
  });

  it("null si el comentario está vacío", () => {
    expect(ultimaObservacion([item("OBSERVADO_REQUISITOS", "  ", 1)])).toBeNull();
    expect(ultimaObservacion([item("OBSERVADO_REQUISITOS", null, 1)])).toBeNull();
  });
});
