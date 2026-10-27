import { describe, expect, it } from "vitest";
import {
  DOCUMENTOS,
  documentosFaltantes,
  documentosOpcionales,
  documentosRequeridos,
  planSeguridadFisico,
  type ContextoDocumentos,
} from "./documentos";

const ctx = (o: Partial<ContextoDocumentos> = {}): ContextoDocumentos => ({
  nivelRiesgo: "MEDIO",
  tieneCocina: false,
  esGrifo: false,
  almacenaInflamables: false,
  ...o,
});

const BASICOS = ["FICHA_RUC", "EXTINTORES_PQS", "CAPACITACION_EXTINTORES"];
const TECNICOS = [
  "PLANO_ARQUITECTURA_AFORO",
  "PLANOS_ELECTRICOS",
  "POZO_TIERRA",
  "MEMORIA_PRUEBAS_EQUIPOS",
];

describe("documentosRequeridos", () => {
  it("nivel null no requiere nada", () => {
    expect(documentosRequeridos(ctx({ nivelRiesgo: null, tieneCocina: true }))).toEqual([]);
  });

  it.each(["BAJO", "MEDIO"] as const)("%s sin extras pide los 3 básicos", (nivelRiesgo) => {
    expect(documentosRequeridos(ctx({ nivelRiesgo }))).toEqual(BASICOS);
  });

  it.each(["BAJO", "MEDIO", "ALTO", "MUY_ALTO"] as const)("cocina agrega Tipo K en %s", (nivelRiesgo) => {
    expect(documentosRequeridos(ctx({ nivelRiesgo, tieneCocina: true }))).toContain(
      "EXTINTORES_TIPO_K",
    );
  });

  it.each(["BAJO", "MEDIO", "ALTO", "MUY_ALTO"] as const)("grifo agrega Osinergmin en %s", (nivelRiesgo) => {
    expect(documentosRequeridos(ctx({ nivelRiesgo, esGrifo: true }))).toContain(
      "LICENCIA_OSINERGMIN",
    );
  });

  it.each(["BAJO", "MEDIO", "ALTO", "MUY_ALTO"] as const)("inflamables sin grifo no agrega Osinergmin en %s", (nivelRiesgo) => {
    expect(documentosRequeridos(ctx({ nivelRiesgo, almacenaInflamables: true }))).not.toContain(
      "LICENCIA_OSINERGMIN",
    );
  });

  it("el pozo a tierra es opcional solo en riesgo bajo y medio", () => {
    for (const nivelRiesgo of ["BAJO", "MEDIO"] as const)
      expect(documentosOpcionales(ctx({ nivelRiesgo }))).toEqual(["POZO_TIERRA"]);
    for (const nivelRiesgo of ["ALTO", "MUY_ALTO", null] as const)
      expect(documentosOpcionales(ctx({ nivelRiesgo }))).toEqual([]);
  });

  it.each(["ALTO", "MUY_ALTO"] as const)("%s agrega los 4 técnicos, en orden de catálogo", (nivelRiesgo) => {
    expect(documentosRequeridos(ctx({ nivelRiesgo }))).toEqual([...BASICOS, ...TECNICOS].sort(
      (a, b) =>
        DOCUMENTOS.findIndex((d) => d.tipo === a) - DOCUMENTOS.findIndex((d) => d.tipo === b),
    ));
  });

  it("sin duplicados y sin tipos obsoletos con todo activo", () => {
    const r = documentosRequeridos(
      ctx({ nivelRiesgo: "MUY_ALTO", tieneCocina: true, esGrifo: true, almacenaInflamables: true }),
    );
    expect(new Set(r).size).toBe(r.length);
    expect(r).toHaveLength(9);
    for (const o of ["PLANO_UBICACION", "PLANO_DISTRIBUCION", "PLAN_SEGURIDAD", "COMPROBANTE_PAGO", "EXTINTORES"])
      expect(r).not.toContain(o);
  });
});

describe("documentosFaltantes", () => {
  it("devuelve los requeridos no subidos", () => {
    expect(documentosFaltantes(["FICHA_RUC"], ctx())).toEqual([
      "EXTINTORES_PQS",
      "CAPACITACION_EXTINTORES",
    ]);
  });
  it("un subido no requerido no aparece ni bloquea", () => {
    expect(documentosFaltantes([...BASICOS, "POZO_TIERRA"] as never, ctx())).toEqual([]);
  });
  it("nivel null devuelve []", () => {
    expect(documentosFaltantes([], ctx({ nivelRiesgo: null }))).toEqual([]);
  });
});

describe("planSeguridadFisico", () => {
  it("MEDIO, ALTO y MUY_ALTO lo piden", () => {
    for (const n of ["MEDIO", "ALTO", "MUY_ALTO"] as const) expect(planSeguridadFisico(n)).toBe(true);
  });
  it("BAJO y nivel null no lo piden", () => {
    expect(planSeguridadFisico("BAJO")).toBe(false);
    expect(planSeguridadFisico(null)).toBe(false);
  });
});
