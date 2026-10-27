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
  const base = { nivelRiesgo: "MEDIO" as const, numeroPisos: 2, tieneSotano: false, areaM2: 500 };
  it("ALTO/MUY_ALTO siempre true", () => {
    expect(planSeguridadFisico({ ...base, nivelRiesgo: "ALTO", numeroPisos: 9, areaM2: 9999 })).toBe(true);
    expect(planSeguridadFisico({ ...base, nivelRiesgo: "MUY_ALTO", tieneSotano: true })).toBe(true);
  });
  it("BAJO/MEDIO true en los límites 2 pisos y 500 m2", () => {
    expect(planSeguridadFisico(base)).toBe(true);
    expect(planSeguridadFisico({ ...base, nivelRiesgo: "BAJO" })).toBe(true);
  });
  it("false con 3 pisos, sótano o 500,01 m2", () => {
    expect(planSeguridadFisico({ ...base, numeroPisos: 3 })).toBe(false);
    expect(planSeguridadFisico({ ...base, tieneSotano: true })).toBe(false);
    expect(planSeguridadFisico({ ...base, areaM2: 500.01 })).toBe(false);
  });
  it("nivel null es false", () => {
    expect(planSeguridadFisico({ ...base, nivelRiesgo: null })).toBe(false);
  });
});

describe("DOCUMENTOS", () => {
  it("tiene 9 tipos con etiqueta en español", () => {
    expect(DOCUMENTOS).toHaveLength(9);
    expect(DOCUMENTOS.every((d) => d.etiqueta.length > 0)).toBe(true);
    expect(DOCUMENTOS.find((d) => d.tipo === "FICHA_RUC")?.etiqueta).toBe("Ficha RUC");
  });
});
