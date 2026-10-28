import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const h = vi.hoisted(() => ({
  lecturas: [] as unknown[],
  actualizados: [{ id: "x" }] as unknown[],
  sets: [] as Record<string, unknown>[],
  batch: vi.fn(),
}));

function cadena() {
  const c: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "orderBy"]) c[m] = () => c;
  c.then = (res: (v: unknown) => unknown) => res(h.lecturas.shift());
  return c;
}

vi.mock("@/db", () => ({
  db: {
    select: () => cadena(),
    update: () => ({
      set: (v: Record<string, unknown>) => {
        h.sets.push(v);
        return { where: () => ({ returning: () => ({ kind: "update" }) }) };
      },
    }),
    insert: () => ({ select: (q: unknown) => ({ kind: "insert", q }) }),
    batch: h.batch,
  },
}));

const FERIADOS_SEMILLA = vi.hoisted(() => {
  const comunes = ["05-01", "06-29", "07-28", "07-29", "08-30", "10-08", "11-01", "12-08", "12-09", "12-25"];
  return [
    ...["01-01", "04-02", "04-03", ...comunes].map((f) => `2026-${f}`),
    ...["01-01", "03-25", "03-26", ...comunes].map((f) => `2027-${f}`),
  ];
});

const SEMILLA = vi.hoisted(() => [
  { codigo: "RETIRAR_OBSTACULOS_EVACUACION", descripcion: "Retirar obstáculos de los medios de evacuación." },
  { codigo: "COLOCAR_SENALIZACION", descripcion: "Colocar señalización de seguridad." },
  { codigo: "EXTINTORES", descripcion: "Instalar, recargar o reubicar extintores." },
  { codigo: "TAPAS_TABLEROS_ELECTRICOS", descripcion: "Colocar tapas a los tableros eléctricos." },
  { codigo: "TAPA_CAJAS_DE_PASO", descripcion: "Colocar tapa a las cajas de paso." },
  { codigo: "ILUMINACION_TABLEROS", descripcion: "Instalar iluminación en la zona de tableros." },
]);

vi.mock("@/modules/configuracion/services/catalogo-lectura.service", () => ({
  getCatalogoActivo: vi.fn(async () => SEMILLA),
}));

vi.mock("@/modules/configuracion/services/feriado-lectura.service", () => ({
  getFeriados: vi.fn(async () => FERIADOS_SEMILLA),
}));

import { getCatalogoActivo } from "@/modules/configuracion/services/catalogo-lectura.service";
import { getFeriados } from "@/modules/configuracion/services/feriado-lectura.service";
import { cambiarEstado } from "@/modules/expedientes/services/transicion.service";
import {
  getResumenSubsanacion,
  programarDiligencia,
  registrarResultadoDiligencia,
} from "@/modules/inspecciones/services/diligencia.service";
import { calcularLimiteSubsanacion } from "@/modules/inspecciones/utils/plazo-subsanacion";

const admin = { id: "u1", rol: "admin" as const };
const superadmin = { id: "u2", rol: "superadmin" as const };
const cliente = { id: "u3", rol: "cliente" as const };

const exp = (estado: string, numero: string | null = "EXP-1", nivelRiesgo: string | null = "BAJO") => [
  { estado, numero, nivelRiesgo },
];
const ahora = new Date("2026-11-01T12:00:00.000Z");
const futura = new Date("2026-11-03T05:00:00.000Z");
const informe = "Cumple con todo lo exigido.";

beforeEach(() => {
  h.lecturas = [];
  h.actualizados = [{ id: "x" }];
  h.sets = [];
  h.batch.mockReset();
  h.batch.mockImplementation(async () => [h.actualizados]);
});

describe("programarDiligencia", () => {
  it("lanza para cliente", async () => {
    await expect(programarDiligencia(cliente, "e", futura, ahora)).rejects.toThrow("No autorizado");
  });

  it("no_encontrado: inexistente o sin número", async () => {
    h.lecturas = [[]];
    expect(await programarDiligencia(admin, "e", futura, ahora)).toEqual({ status: "no_encontrado" });
    h.lecturas = [exp("INSPECTOR_DESIGNADO", null)];
    expect(await programarDiligencia(admin, "e", futura, ahora)).toEqual({ status: "no_encontrado" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("no_permitido: estado distinto, aunque la fecha sea inválida", async () => {
    h.lecturas = [exp("APROBADO_JEFATURA")];
    expect(await programarDiligencia(admin, "e", new Date(0), ahora)).toEqual({ status: "no_permitido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("fecha_invalida: pasada o a más de 90 días", async () => {
    h.lecturas = [exp("INSPECTOR_DESIGNADO")];
    const ayer = new Date("2026-10-31T05:00:00.000Z");
    expect(await programarDiligencia(admin, "e", ayer, ahora)).toEqual({ status: "fecha_invalida" });
    h.lecturas = [exp("INSPECTOR_DESIGNADO")];
    const lejos = new Date(new Date("2026-11-01T05:00:00.000Z").getTime() + 91 * 86_400_000);
    expect(await programarDiligencia(admin, "e", lejos, ahora)).toEqual({ status: "fecha_invalida" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("ok: un solo batch y comentario solo con fecha de Lima", async () => {
    h.lecturas = [exp("INSPECTOR_DESIGNADO")];
    expect(await programarDiligencia(admin, "e", futura, ahora)).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(1);
    const [sentencias] = h.batch.mock.calls[0];
    expect(sentencias.map((s: { kind: string }) => s.kind)).toEqual(["update", "insert"]);
    const historial = new PgDialect().sqlToQuery(sentencias[1].q);
    expect(historial.params).toEqual(
      expect.arrayContaining([
        "INSPECTOR_DESIGNADO",
        "DILIGENCIA_PROGRAMADA",
        "u1",
        "Diligencia programada para el 03/11/2026.",
      ]),
    );
  });

  it("conflicto: el UPDATE afecta 0 filas", async () => {
    h.lecturas = [exp("INSPECTOR_DESIGNADO")];
    h.actualizados = [];
    expect(await programarDiligencia(superadmin, "e", futura, ahora)).toEqual({ status: "conflicto" });
    expect(h.batch).toHaveBeenCalledTimes(1);
  });
});

describe("registrarResultadoDiligencia", () => {
  it("lanza para cliente", async () => {
    await expect(
      registrarResultadoDiligencia(cliente, "e", { resultado: "CUMPLE" }),
    ).rejects.toThrow("No autorizado");
  });

  it("no_encontrado", async () => {
    h.lecturas = [[]];
    expect(await registrarResultadoDiligencia(admin, "e", { resultado: "CUMPLE" })).toEqual({
      status: "no_encontrado",
    });
  });

  it.each(["INSPECTOR_DESIGNADO", "APROBADO_JEFATURA", "CUMPLE"])(
    "no_permitido desde %s, sin batch",
    async (estado) => {
      h.lecturas = [exp(estado)];
      expect(await registrarResultadoDiligencia(admin, "e", { resultado: "CUMPLE" })).toEqual({
        status: "no_permitido",
      });
      expect(h.batch).not.toHaveBeenCalled();
    },
  );

  it("no_permitido: resultado fuera de CUMPLE/NO_CUMPLE", async () => {
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA")];
    const r = await registrarResultadoDiligencia(superadmin, "e", {
      resultado: "ANULADO" as never,
    });
    expect(r).toEqual({ status: "no_permitido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("ok: un solo batch con el comentario automático", async () => {
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA")];
    const r = await registrarResultadoDiligencia(admin, "e", { resultado: "NO_CUMPLE" });
    expect(r).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(1);
    const [sentencias] = h.batch.mock.calls[0];
    const historial = new PgDialect().sqlToQuery(sentencias[1].q);
    expect(historial.params).toEqual(
      expect.arrayContaining(["DILIGENCIA_PROGRAMADA", "NO_CUMPLE", "u1", "Resultado de la inspección: No cumple."]),
    );
  });

  it("conflicto: el UPDATE afecta 0 filas", async () => {
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA")];
    h.actualizados = [];
    expect(await registrarResultadoDiligencia(admin, "e", { resultado: "CUMPLE" })).toEqual({
      status: "conflicto",
    });
  });
});

describe("registrarResultadoDiligencia: suspensión con observaciones", () => {
  const [c1, c2] = SEMILLA;
  const ahoraSub = new Date("2026-10-28T15:00:00.000Z");
  const hoy = new Date("2026-10-28T05:00:00.000Z");
  const suspender = (extra: Record<string, unknown>) =>
    registrarResultadoDiligencia(admin, "e", { resultado: "EN_SUBSANACION", ...extra }, ahoraSub);
  const params = (q: unknown) => new PgDialect().sqlToQuery(q as never).params;

  it("lanza para cliente", async () => {
    await expect(
      registrarResultadoDiligencia(cliente, "e", { resultado: "EN_SUBSANACION" }),
    ).rejects.toThrow("No autorizado");
  });

  it("no_permitido: estado distinto o riesgo nulo", async () => {
    h.lecturas = [exp("INSPECTOR_DESIGNADO")];
    expect(await suspender({ codigos: [c1.codigo] })).toEqual({ status: "no_permitido" });
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA", "EXP-1", null)];
    expect(await suspender({ codigos: [c1.codigo] })).toEqual({ status: "no_permitido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it.each([
    [{}, "observaciones_requeridas"],
    [{ codigos: ["no-existe"] }, "observacion_invalida"],
    [{ codigos: ["EXTINTORES", "EXTINTORES"] }, "observacion_invalida"],
    [{ codigos: ["EXTINTORES"], libres: ["Grieta en la columna"] }, "observacion_relevante"],
  ])("POSTERIOR %j -> %s, sin batch", async (extra, status) => {
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA", "EXP-1", "BAJO")];
    expect(await suspender(extra)).toEqual({ status });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("POSTERIOR: enviar fecha es reprogramacion_invalida", async () => {
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA", "EXP-1", "MEDIO")];
    expect(await suspender({ codigos: [c1.codigo], reprogramadaPara: hoy })).toEqual({
      status: "reprogramacion_invalida",
    });
  });

  it("POSTERIOR ok: un batch, límite 02/11/2026, comentario y filas del catálogo", async () => {
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA", "EXP-1", "BAJO")];
    expect(await suspender({ codigos: [c1.codigo, c2.codigo] })).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(1);
    expect(h.sets[0]).toMatchObject({
      estado: "EN_SUBSANACION",
      subsanacionLimite: new Date("2026-11-02T05:00:00.000Z"),
    });
    expect(h.sets[0]).not.toHaveProperty("diligenciaProgramadaPara");
    const [sentencias] = h.batch.mock.calls[0];
    expect(sentencias.map((x: { kind: string }) => x.kind)).toEqual([
      "update",
      "insert",
      "insert",
      "insert",
    ]);
    expect(params(sentencias[1].q)).toEqual(
      expect.arrayContaining([
        "DILIGENCIA_PROGRAMADA",
        "EN_SUBSANACION",
        "u1",
        `Resultado de la inspección: Observaciones subsanables. Plazo para subsanar: hasta el 02/11/2026.`,
      ]),
    );
    expect(params(sentencias[2].q)).toEqual(expect.arrayContaining([c1.codigo, c1.descripcion]));
    expect(params(sentencias[3].q)).toEqual(expect.arrayContaining([c2.codigo, c2.descripcion]));
  });

  it("un código desactivado (fuera del catálogo activo) es observacion_invalida y no escribe", async () => {
    vi.mocked(getCatalogoActivo).mockResolvedValueOnce(SEMILLA.slice(1));
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA", "EXP-1", "BAJO")];
    expect(await suspender({ codigos: [c1.codigo] })).toEqual({ status: "observacion_invalida" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("un feriado extra mueve el límite un día hábil", async () => {
    vi.mocked(getFeriados).mockResolvedValueOnce([...FERIADOS_SEMILLA, "2026-10-30"]);
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA", "EXP-1", "BAJO")];
    expect(await suspender({ codigos: [c1.codigo] })).toEqual({ status: "ok" });
    expect(h.sets[0]).toMatchObject({ subsanacionLimite: new Date("2026-11-03T05:00:00.000Z") });
  });

  it.each([
    ["sin fecha", undefined],
    ["pasada", new Date("2026-10-27T05:00:00.000Z")],
    [
      "después del límite",
      new Date(calcularLimiteSubsanacion("PREVIA", ahoraSub, FERIADOS_SEMILLA).getTime() + 86_400_000),
    ],
  ])("PREVIA %s: reprogramacion_invalida", async (_n, reprogramadaPara) => {
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA", "EXP-1", "ALTO")];
    expect(await suspender({ libres: ["Grieta en la columna"], reprogramadaPara })).toEqual({
      status: "reprogramacion_invalida",
    });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("PREVIA ok: reprograma la diligencia, lo anota y guarda libres recortadas", async () => {
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA", "EXP-1", "MUY_ALTO")];
    const fecha = new Date("2026-11-10T05:00:00.000Z");
    const r = await suspender({
      codigos: [c1.codigo],
      libres: ["  Grieta en la columna  ", "   "],
      reprogramadaPara: fecha,
    });
    expect(r).toEqual({ status: "ok" });
    const limite = calcularLimiteSubsanacion("PREVIA", ahoraSub, FERIADOS_SEMILLA);
    expect(h.sets[0]).toMatchObject({ diligenciaProgramadaPara: fecha, subsanacionLimite: limite });
    const [sentencias] = h.batch.mock.calls[0];
    expect(sentencias).toHaveLength(4);
    const comentario = params(sentencias[1].q).find(
      (x) => typeof x === "string" && x.startsWith("Resultado de la inspección: Observaciones subsanables."),
    );
    expect(comentario).toMatch(/ Nueva inspección: 10\/11\/2026\.$/);
    expect(comentario).toMatch(/ Plazo para subsanar: hasta el \d{2}\/\d{2}\/2026\./);
    expect(params(sentencias[3].q)).toEqual(expect.arrayContaining([null, "Grieta en la columna"]));
  });

  it("conflicto: el UPDATE afecta 0 filas", async () => {
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA")];
    h.actualizados = [];
    expect(await suspender({ codigos: [c1.codigo] })).toEqual({ status: "conflicto" });
  });

  it("NO_CUMPLE con observaciones las guarda en el mismo batch", async () => {
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA")];
    const r = await registrarResultadoDiligencia(admin, "e", {
      resultado: "NO_CUMPLE",
      codigos: [c1.codigo],
      libres: ["Grieta en la columna"],
    });
    expect(r).toEqual({ status: "ok" });
    const [sentencias] = h.batch.mock.calls[0];
    expect(sentencias.map((x: { kind: string }) => x.kind)).toEqual([
      "update",
      "insert",
      "insert",
      "insert",
    ]);
  });

  it("NO_CUMPLE sin observaciones solo hace update e historial; código inexistente es observacion_invalida", async () => {
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA")];
    await registrarResultadoDiligencia(admin, "e", { resultado: "NO_CUMPLE" });
    expect(h.batch.mock.calls[0][0]).toHaveLength(2);
    h.batch.mockClear();
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA")];
    const r = await registrarResultadoDiligencia(admin, "e", {
      resultado: "NO_CUMPLE",
      codigos: ["x"],
    });
    expect(r).toEqual({ status: "observacion_invalida" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("CUMPLE con observaciones es no_permitido", async () => {
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA")];
    const r = await registrarResultadoDiligencia(admin, "e", {
      resultado: "CUMPLE",
      libres: ["Algo largo"],
    });
    expect(r).toEqual({ status: "no_permitido" });
    expect(h.batch).not.toHaveBeenCalled();
  });
});

describe("getResumenSubsanacion", () => {
  const limite = new Date("2026-11-02T05:00:00.000Z");
  const filas = [
    { id: "o1", descripcion: "Extintores", codigo: "EXTINTORES" },
    { id: "o2", descripcion: "Grieta", codigo: null },
  ];

  it("devuelve tipo, límite y observaciones", async () => {
    h.lecturas = [[{ nivelRiesgo: "ALTO", limite }], filas];
    expect(await getResumenSubsanacion(admin, "e")).toEqual({
      tipoItse: "PREVIA",
      limite,
      observaciones: [
        { id: "o1", descripcion: "Extintores", esCatalogo: true },
        { id: "o2", descripcion: "Grieta", esCatalogo: false },
      ],
    });
  });

  it("cliente ajeno o inexistente: vacío, sin leer observaciones", async () => {
    h.lecturas = [[], filas];
    expect(await getResumenSubsanacion(cliente, "e")).toEqual({
      tipoItse: null,
      limite: null,
      observaciones: [],
    });
    expect(h.lecturas).toHaveLength(1);
  });

  it("cliente dueño", async () => {
    h.lecturas = [[{ nivelRiesgo: "BAJO", limite: null }], []];
    expect(await getResumenSubsanacion(cliente, "e")).toEqual({
      tipoItse: "POSTERIOR",
      limite: null,
      observaciones: [],
    });
  });
});

describe("sin atajo por cambiarEstado", () => {
  it.each(["DILIGENCIA_PROGRAMADA", "EN_SUBSANACION", "CUMPLE", "NO_CUMPLE"] as const)("rechaza %s", async (hasta) => {
    h.lecturas = [[{ estado: "DILIGENCIA_PROGRAMADA", nivelRiesgo: "BAJO", numero: "n" }]];
    expect(await cambiarEstado(superadmin, "e", { hasta, comentario: informe })).toEqual({
      status: "no_permitido",
    });
    expect(h.batch).not.toHaveBeenCalled();
  });
});
