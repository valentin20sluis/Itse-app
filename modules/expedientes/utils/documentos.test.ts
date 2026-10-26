import { describe, expect, it } from "vitest";
import { DOCUMENTOS, documentosFaltantes } from "./documentos";

const REQUERIDOS = [
  "PLANO_UBICACION",
  "PLANO_DISTRIBUCION",
  "PLAN_SEGURIDAD",
  "COMPROBANTE_PAGO",
] as const;

describe("documentosFaltantes", () => {
  it("sin subidos faltan los 4 requeridos", () => {
    expect(documentosFaltantes([])).toEqual(REQUERIDOS);
  });
  it("con 3 requeridos falta el restante", () => {
    expect(documentosFaltantes(REQUERIDOS.slice(0, 3))).toEqual(["COMPROBANTE_PAGO"]);
  });
  it("con los 4 requeridos no falta nada", () => {
    expect(documentosFaltantes([...REQUERIDOS])).toEqual([]);
  });
  it("los opcionales no cuentan", () => {
    expect(documentosFaltantes(["POZO_TIERRA", "EXTINTORES"])).toEqual(REQUERIDOS);
    expect(documentosFaltantes([...REQUERIDOS, "POZO_TIERRA"])).toEqual([]);
  });
});

describe("DOCUMENTOS", () => {
  it("tiene 6 tipos con etiqueta en español", () => {
    expect(DOCUMENTOS).toHaveLength(6);
    expect(DOCUMENTOS.every((d) => d.etiqueta.length > 0)).toBe(true);
    expect(DOCUMENTOS.find((d) => d.tipo === "PLAN_SEGURIDAD")?.etiqueta).toBe("Plan de seguridad");
  });
});
