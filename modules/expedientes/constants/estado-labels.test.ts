import { describe, expect, it } from "vitest";

import { estadoExpedienteEnum } from "@/db/schema";

import { ESTADO_LABELS } from "./estado-labels";

describe("ESTADO_LABELS", () => {
  it("tiene etiqueta y variante para cada estado del enum", () => {
    for (const estado of estadoExpedienteEnum.enumValues) {
      expect(ESTADO_LABELS[estado]?.label, estado).toBeTruthy();
      expect(ESTADO_LABELS[estado]?.variant, estado).toBeTruthy();
    }
    expect(Object.keys(ESTADO_LABELS)).toHaveLength(estadoExpedienteEnum.enumValues.length);
  });

  it("usa las etiquetas acordadas", () => {
    expect(ESTADO_LABELS.PRESENTADO.label).toBe("Presentado");
    expect(ESTADO_LABELS.BORRADOR.label).toBe("Borrador");
    expect(ESTADO_LABELS.OBSERVADO_REQUISITOS.label).toBe("Observado");
  });
});
