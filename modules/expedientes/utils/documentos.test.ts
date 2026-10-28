import { describe, expect, it } from "vitest";
import { validateArchivo } from "./archivo";
import {
  DOCUMENTOS,
  DOCUMENTOS_SUBSANACION,
  TIPOS_SOLO_PDF,
  esDocumentoSubsanacion,
  ESTADOS_EDITABLES_CLIENTE,
  documentosFaltantes,
  documentosOpcionales,
  documentosRequeridos,
  type ContextoDocumentos,
} from "./documentos";

const ctx = (o: Partial<ContextoDocumentos> = {}): ContextoDocumentos => ({
  nivelRiesgo: "MEDIO",
  calidadSolicitante: "PROPIETARIO",
  tieneCocina: false,
  esGrifo: false,
  almacenaInflamables: false,
  numeroPisos: 1,
  ...o,
});

const BASICOS = ["DNI_AMBAS_CARAS", "FICHA_RUC", "EXTINTORES_PQS", "CAPACITACION_EXTINTORES"];
const TECNICOS = [
  "PLANO_ARQUITECTURA_AFORO",
  "PLANOS_ELECTRICOS",
  "POZO_TIERRA",
  "MEMORIA_PRUEBAS_EQUIPOS",
];

describe("ESTADOS_EDITABLES_CLIENTE", () => {
  it("son BORRADOR y OBSERVADO_REQUISITOS", () => {
    expect(ESTADOS_EDITABLES_CLIENTE).toEqual(["BORRADOR", "OBSERVADO_REQUISITOS"]);
  });
});

describe("documentosRequeridos", () => {
  it("nivel null no requiere nada", () => {
    expect(documentosRequeridos(ctx({ nivelRiesgo: null, tieneCocina: true }))).toEqual([]);
  });

  it.each(["BAJO", "MEDIO"] as const)("%s sin extras pide DNI y los 3 básicos", (nivelRiesgo) => {
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

  it.each(["ALTO", "MUY_ALTO"] as const)("%s agrega los 4 técnicos y el plan, en orden de catálogo", (nivelRiesgo) => {
    expect(documentosRequeridos(ctx({ nivelRiesgo }))).toEqual([...BASICOS, ...TECNICOS, "PLAN_SEGURIDAD"].sort(
      (a, b) =>
        DOCUMENTOS.findIndex((d) => d.tipo === a) - DOCUMENTOS.findIndex((d) => d.tipo === b),
    ));
  });

  it("sin duplicados y con todo activo", () => {
    const r = documentosRequeridos(
      ctx({ nivelRiesgo: "MUY_ALTO", tieneCocina: true, esGrifo: true, almacenaInflamables: true }),
    );
    expect(new Set(r).size).toBe(r.length);
    expect(r).toHaveLength(11);
    for (const o of ["PLANO_UBICACION", "PLANO_DISTRIBUCION", "COMPROBANTE_PAGO", "EXTINTORES"])
      expect(r).not.toContain(o);
  });
});

describe("DNI y acreditación del solicitante", () => {
  it("el DNI se pide siempre con nivel y nunca con nivel null", () => {
    for (const nivelRiesgo of ["BAJO", "MEDIO", "ALTO", "MUY_ALTO"] as const)
      expect(documentosRequeridos(ctx({ nivelRiesgo }))).toContain("DNI_AMBAS_CARAS");
    expect(documentosRequeridos(ctx({ nivelRiesgo: null }))).not.toContain("DNI_AMBAS_CARAS");
  });
  it("la acreditación solo se pide si no es propietario", () => {
    expect(documentosRequeridos(ctx())).not.toContain("ACREDITACION_REPRESENTACION");
    for (const calidadSolicitante of ["REPRESENTANTE_LEGAL", "ADMINISTRADOR"] as const)
      expect(documentosRequeridos(ctx({ calidadSolicitante }))).toContain(
        "ACREDITACION_REPRESENTACION",
      );
  });
  it("DNI y acreditación van primero, sin duplicados", () => {
    const r = documentosRequeridos(ctx({ calidadSolicitante: "ADMINISTRADOR" }));
    expect(r.slice(0, 2)).toEqual(["DNI_AMBAS_CARAS", "ACREDITACION_REPRESENTACION"]);
    expect(new Set(r).size).toBe(r.length);
  });
  it("faltantes: reporta DNI y acreditación; con propietario la acreditación sobrante no bloquea", () => {
    expect(
      documentosFaltantes(BASICOS.slice(1) as never, ctx({ calidadSolicitante: "ADMINISTRADOR" })),
    ).toEqual(["DNI_AMBAS_CARAS", "ACREDITACION_REPRESENTACION"]);
    expect(documentosFaltantes([...BASICOS, "ACREDITACION_REPRESENTACION"] as never, ctx())).toEqual(
      [],
    );
  });
});

describe("documentosFaltantes", () => {
  it("devuelve los requeridos no subidos", () => {
    expect(documentosFaltantes(["DNI_AMBAS_CARAS", "FICHA_RUC"], ctx())).toEqual([
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

describe("Plan de seguridad", () => {
  it.each([
    ["MEDIO", 1, false],
    ["MEDIO", 2, true],
    ["MEDIO", 3, true],
    ["BAJO", 3, false],
    ["ALTO", 1, true],
    ["MUY_ALTO", 1, true],
  ] as const)("%s con %i piso(s): requerido=%s", (nivelRiesgo, numeroPisos, esperado) => {
    expect(documentosRequeridos(ctx({ nivelRiesgo, numeroPisos })).includes("PLAN_SEGURIDAD")).toBe(
      esperado,
    );
  });
  it("el catálogo tiene 12 tipos", () => {
    expect(DOCUMENTOS).toHaveLength(12);
  });
});

describe("documentos de subsanación", () => {
  it("lista los 2 tipos con su etiqueta y no están en la solicitud", () => {
    expect(DOCUMENTOS_SUBSANACION).toEqual([
      { tipo: "SUBSANACION_DECLARACION_JURADA", etiqueta: "Declaración jurada de subsanación" },
      {
        tipo: "SUBSANACION_PANEL_FOTOGRAFICO",
        etiqueta: "Panel fotográfico de subsanación (con leyenda)",
      },
    ]);
    for (const d of DOCUMENTOS_SUBSANACION) {
      expect(DOCUMENTOS.some((x) => x.tipo === d.tipo)).toBe(false);
      expect(esDocumentoSubsanacion(d.tipo)).toBe(true);
    }
    expect(esDocumentoSubsanacion("FICHA_RUC")).toBe(false);
    const todos = documentosRequeridos(ctx({ nivelRiesgo: "MUY_ALTO", tieneCocina: true, esGrifo: true }));
    expect(todos.some(esDocumentoSubsanacion)).toBe(false);
  });

  it("solo la declaración jurada es solo PDF", () => {
    expect(TIPOS_SOLO_PDF).toContain("SUBSANACION_DECLARACION_JURADA");
    expect(TIPOS_SOLO_PDF).not.toContain("SUBSANACION_PANEL_FOTOGRAFICO");
  });

  it("validateArchivo: la declaración rechaza imagen; el panel acepta imagen o PDF", () => {
    const archivo = (type: string, tipo: "SUBSANACION_DECLARACION_JURADA" | "SUBSANACION_PANEL_FOTOGRAFICO") =>
      validateArchivo({ name: "a", type, size: 1000, tipo });
    expect(archivo("image/jpeg", "SUBSANACION_DECLARACION_JURADA")).toEqual({
      ok: false,
      error: "Este documento debe ser un PDF.",
    });
    expect(archivo("application/pdf", "SUBSANACION_DECLARACION_JURADA")).toEqual({ ok: true });
    expect(archivo("image/png", "SUBSANACION_PANEL_FOTOGRAFICO")).toEqual({ ok: true });
    expect(archivo("application/pdf", "SUBSANACION_PANEL_FOTOGRAFICO")).toEqual({ ok: true });
  });
});
