import { describe, expect, it } from "vitest";
import { opcionesEvaluacion, puedeSubirEvidencia } from "./subsanacion";

const TODAS = [
  { presentada: false, vencido: false },
  { presentada: false, vencido: true },
  { presentada: true, vencido: false },
  { presentada: true, vencido: true },
] as const;

describe("opcionesEvaluacion", () => {
  it.each([
    [false, false, ["NO_CUMPLE"]],
    [false, true, ["NO_CUMPLE"]],
    [true, false, ["CUMPLE", "SIGUE_EN_SUBSANACION", "NO_CUMPLE"]],
    [true, true, ["CUMPLE", "NO_CUMPLE"]],
  ])("POSTERIOR presentada=%s vencido=%s", (presentada, vencido, esperado) => {
    expect(opcionesEvaluacion({ tipoItse: "POSTERIOR", presentada, vencido })).toEqual(esperado);
  });

  it("PREVIA: siempre Cumple y No cumple", () => {
    for (const c of TODAS) {
      expect(opcionesEvaluacion({ tipoItse: "PREVIA", ...c })).toEqual(["CUMPLE", "NO_CUMPLE"]);
    }
  });
});

describe("puedeSubirEvidencia", () => {
  it("solo en posterior, sin presentar y con plazo vigente", () => {
    for (const tipoItse of ["POSTERIOR", "PREVIA"] as const) {
      for (const c of TODAS) {
        expect(puedeSubirEvidencia({ tipoItse, ...c })).toBe(
          tipoItse === "POSTERIOR" && !c.presentada && !c.vencido,
        );
      }
    }
  });
});
