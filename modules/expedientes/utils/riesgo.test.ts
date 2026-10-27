import { describe, expect, it } from "vitest";
import {
  MAX_AREA_MEDIO_M2,
  MAX_PISOS_MEDIO,
  sugerirNivelRiesgo,
  tipoItsePorRiesgo,
} from "./riesgo";

const base = {
  areaM2: 100,
  numeroPisos: 1,
  tieneSotano: false,
  almacenaInflamables: false,
  esGrifo: false,
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
  it("umbrales del proyecto: 2 pisos y 500 m2", () => {
    expect(MAX_PISOS_MEDIO).toBe(2);
    expect(MAX_AREA_MEDIO_M2).toBe(500);
  });
  it("2 pisos y 500 m2 sin factores es MEDIO", () => {
    expect(sugerirNivelRiesgo({ ...base, numeroPisos: 2, areaM2: 500 })).toBe("MEDIO");
  });
  it("3 pisos es ALTO", () => {
    expect(sugerirNivelRiesgo({ ...base, numeroPisos: 3 })).toBe("ALTO");
  });
  it("500,01 m2 es ALTO", () => {
    expect(sugerirNivelRiesgo({ ...base, areaM2: 500.01 })).toBe("ALTO");
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
    expect(sugerirNivelRiesgo({ ...base, numeroPisos: 3, tieneSotano: true })).toBe("MUY_ALTO");
  });
  it("tope MUY_ALTO con ALTO y dos factores", () => {
    expect(
      sugerirNivelRiesgo({
        ...base,
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
  it("grifo es siempre MEDIO, aunque haya pisos, área, sótano e inflamables", () => {
    expect(
      sugerirNivelRiesgo({
        areaM2: 2000,
        numeroPisos: 5,
        tieneSotano: true,
        almacenaInflamables: true,
        esGrifo: true,
      }),
    ).toBe("MEDIO");
  });
});

describe("sugerirNivelRiesgo - Hospedaje", () => {
  const h = { ...base, funcion: "HOSPEDAJE", numeroCamas: 10 };

  it("mínimo es MEDIO, nunca BAJO", () => {
    expect(sugerirNivelRiesgo({ ...h, areaM2: 1 })).toBe("MEDIO");
  });
  it.each([
    [2, "MEDIO"],
    [3, "ALTO"],
    [4, "ALTO"],
    [5, "MUY_ALTO"],
  ] as const)("%i pisos -> %s", (numeroPisos, esperado) => {
    expect(sugerirNivelRiesgo({ ...h, numeroPisos })).toBe(esperado);
  });
  it.each([
    [20, "MEDIO"],
    [21, "ALTO"],
    [100, "ALTO"],
    [101, "MUY_ALTO"],
  ] as const)("%i camas -> %s", (numeroCamas, esperado) => {
    expect(sugerirNivelRiesgo({ ...h, numeroCamas })).toBe(esperado);
  });
  it.each([
    [500, "MEDIO"],
    [501, "ALTO"],
    [3000, "ALTO"],
    [3001, "MUY_ALTO"],
  ] as const)("%i m2 -> %s", (areaM2, esperado) => {
    expect(sugerirNivelRiesgo({ ...h, areaM2 })).toBe(esperado);
  });
  it("toma el máximo entre criterios", () => {
    expect(
      sugerirNivelRiesgo({ ...h, numeroPisos: 2, numeroCamas: 101, areaM2: 400 }),
    ).toBe("MUY_ALTO");
  });
  it("sótano da al menos ALTO", () => {
    expect(sugerirNivelRiesgo({ ...h, tieneSotano: true })).toBe("ALTO");
  });
  it("uso mixto o patrimonio da al menos ALTO", () => {
    expect(sugerirNivelRiesgo({ ...h, usoMixtoPatrimonio: true })).toBe("ALTO");
  });
  it("gran escala da MUY_ALTO", () => {
    expect(sugerirNivelRiesgo({ ...h, granEscala: true })).toBe("MUY_ALTO");
  });
  it("sótano e inflamables no se suman", () => {
    expect(
      sugerirNivelRiesgo({ ...h, tieneSotano: true, almacenaInflamables: true }),
    ).toBe("ALTO");
  });
  it("camas null ignora el criterio de camas", () => {
    expect(sugerirNivelRiesgo({ ...h, numeroCamas: null })).toBe("MEDIO");
  });
  it("grifo tiene prioridad sobre la matriz", () => {
    expect(
      sugerirNivelRiesgo({ ...h, esGrifo: true, numeroPisos: 8, granEscala: true }),
    ).toBe("MEDIO");
  });
});

describe("sugerirNivelRiesgo - otras funciones", () => {
  it("ignora camas, uso mixto y gran escala", () => {
    expect(
      sugerirNivelRiesgo({
        ...base,
        funcion: "COMERCIO",
        numeroCamas: 500,
        usoMixtoPatrimonio: true,
        granEscala: true,
      }),
    ).toBe("MEDIO");
  });
  it("función null usa la lógica general", () => {
    expect(
      sugerirNivelRiesgo({ ...base, funcion: null, tieneSotano: true }),
    ).toBe("ALTO");
  });
});
