import { describe, expect, it } from "vitest";
import { estadoExpedienteEnum } from "@/db/schema";
import { ESTADOS_ORDEN } from "@/modules/reportes/constants/estados-orden";

describe("ESTADOS_ORDEN", () => {
  it("contiene cada estado salvo BORRADOR exactamente una vez", () => {
    const esperados = estadoExpedienteEnum.enumValues.filter((e) => e !== "BORRADOR");
    expect([...ESTADOS_ORDEN].sort()).toEqual([...esperados].sort());
    expect(new Set(ESTADOS_ORDEN).size).toBe(ESTADOS_ORDEN.length);
  });

  it("deja los estados en desuso al final", () => {
    expect(ESTADOS_ORDEN.slice(-3)).toEqual([
      "EN_TRAMITE_EXTERNO",
      "PENDIENTE_RESOLUCION",
      "DERIVADO_COMERCIALIZACION",
    ]);
  });
});
