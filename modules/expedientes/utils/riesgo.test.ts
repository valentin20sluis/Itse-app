import { describe, expect, it } from "vitest";
import { sugerirNivelRiesgo, tipoItsePorRiesgo } from "./riesgo";

const base = {
  areaM2: 100,
  numeroPisos: 1,
  tieneSotano: false,
  almacenaInflamables: false,
};

describe("tipoItsePorRiesgo", () => {
  it.each([
    ["BAJO", "POSTERIOR"],
    ["MEDIO", "POSTERIOR"],
    ["ALTO", "PREVIA"],
    ["MUY_ALTO", "PREVIA"],
  ] as const)("%s -> %s", (nivel, tipo) => {
    expect(tipoItsePorRiesgo(nivel)).toBe(tipo);
  });
});

describe("sugerirNivelRiesgo", () => {
  it("3 pisos y 750 m2 sin factores es MEDIO", () => {
    expect(sugerirNivelRiesgo({ ...base, numeroPisos: 3, areaM2: 750 })).toBe("MEDIO");
  });
  it("4 pisos es ALTO", () => {
    expect(sugerirNivelRiesgo({ ...base, numeroPisos: 4 })).toBe("ALTO");
  });
  it("750,01 m2 es ALTO", () => {
    expect(sugerirNivelRiesgo({ ...base, areaM2: 750.01 })).toBe("ALTO");
  });
  it("sótano sube MEDIO a ALTO", () => {
    expect(sugerirNivelRiesgo({ ...base, tieneSotano: true })).toBe("ALTO");
  });
  it("inflamables sube MEDIO a ALTO", () => {
    expect(sugerirNivelRiesgo({ ...base, almacenaInflamables: true })).toBe("ALTO");
  });
  it("ambos factores sobre MEDIO dan MUY_ALTO", () => {
    expect(
      sugerirNivelRiesgo({ ...base, tieneSotano: true, almacenaInflamables: true }),
    ).toBe("MUY_ALTO");
  });
  it("ALTO con un factor es MUY_ALTO", () => {
    expect(sugerirNivelRiesgo({ ...base, numeroPisos: 4, tieneSotano: true })).toBe("MUY_ALTO");
  });
  it("tope MUY_ALTO con ALTO y dos factores", () => {
    expect(
      sugerirNivelRiesgo({
        areaM2: 5000,
        numeroPisos: 10,
        tieneSotano: true,
        almacenaInflamables: true,
      }),
    ).toBe("MUY_ALTO");
  });
  it("nunca sugiere BAJO", () => {
    expect(sugerirNivelRiesgo({ ...base, areaM2: 1, numeroPisos: 1 })).not.toBe("BAJO");
  });
});
