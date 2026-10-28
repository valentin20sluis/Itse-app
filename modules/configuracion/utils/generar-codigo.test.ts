import { describe, expect, it } from "vitest";
import { generarCodigo, normalizarDescripcion } from "./generar-codigo";

describe("generarCodigo", () => {
  it("mayúsculas y palabras unidas por _", () => {
    expect(generarCodigo("Retirar cajas de la salida")).toBe("RETIRAR_CAJAS_DE_LA_SALIDA");
  });

  it("elimina tildes y símbolos", () => {
    expect(generarCodigo("  ¡Colocar señalización (urgente)! ")).toBe("COLOCAR_SENALIZACION_URGENTE");
  });

  it("recorta a 60 caracteres sin dejar _ al final", () => {
    const c = generarCodigo("palabra ".repeat(20));
    expect(c.length).toBeLessThanOrEqual(60);
    expect(c.endsWith("_")).toBe(false);
  });

  it("agrega sufijo _2, _3 si ya existe", () => {
    expect(generarCodigo("Extintores", ["EXTINTORES"])).toBe("EXTINTORES_2");
    expect(generarCodigo("Extintores", ["EXTINTORES", "EXTINTORES_2"])).toBe("EXTINTORES_3");
  });

  it("con sufijo no pasa de 60", () => {
    const largo = "a".repeat(80);
    const base = generarCodigo(largo);
    expect(generarCodigo(largo, [base]).length).toBeLessThanOrEqual(60);
    expect(generarCodigo(largo, [base])).toMatch(/_2$/);
  });

  it("sin letras ni números usa un código genérico", () => {
    expect(generarCodigo("¡¿?!")).toBe("OBSERVACION");
  });
});

describe("normalizarDescripcion", () => {
  it("ignora mayúsculas, tildes y espacios sobrantes", () => {
    expect(normalizarDescripcion("  Colocar   SEÑALIZACIÓN ")).toBe("colocar senalizacion");
  });
});
