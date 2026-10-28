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
  for (const m of ["from", "where", "limit"]) c[m] = () => c;
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

import {
  evaluarSubsanacion,
  presentarSubsanacion,
} from "@/modules/inspecciones/services/subsanacion.service";
import { opcionesEvaluacion } from "@/modules/inspecciones/utils/subsanacion";

const admin = { id: "u1", rol: "admin" as const };
const superadmin = { id: "u2", rol: "superadmin" as const };
const cliente = { id: "u3", rol: "cliente" as const };

const LIMITE = new Date("2026-11-02T05:00:00.000Z");
const A_TIEMPO = new Date("2026-10-30T15:00:00.000Z");
const VENCIDO = new Date("2026-11-03T15:00:00.000Z");
const informe = "La evidencia es suficiente.";

const exp = (extra: Record<string, unknown> = {}) => [
  {
    estado: "EN_SUBSANACION",
    numero: "EXP-1",
    nivelRiesgo: "BAJO",
    limite: LIMITE,
    presentadaAt: null,
    ...extra,
  },
];
const dosDocs = [{ tipo: "SUBSANACION_DECLARACION_JURADA" }, { tipo: "SUBSANACION_PANEL_FOTOGRAFICO" }];
const params = (q: unknown) => new PgDialect().sqlToQuery(q as never).params;

beforeEach(() => {
  h.lecturas = [];
  h.actualizados = [{ id: "x" }];
  h.sets = [];
  h.batch.mockReset();
  h.batch.mockImplementation(async () => [h.actualizados]);
});

describe("presentarSubsanacion", () => {
  it("lanza para el personal", async () => {
    for (const actor of [admin, superadmin]) {
      await expect(presentarSubsanacion(actor, "e", A_TIEMPO)).rejects.toThrow("No autorizado");
    }
  });

  it("no_encontrado: ajeno, inexistente o sin número", async () => {
    h.lecturas = [[]];
    expect(await presentarSubsanacion(cliente, "e", A_TIEMPO)).toEqual({ status: "no_encontrado" });
    h.lecturas = [exp({ numero: null })];
    expect(await presentarSubsanacion(cliente, "e", A_TIEMPO)).toEqual({ status: "no_encontrado" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it.each([
    ["otro estado", { estado: "CUMPLE" }],
    ["previa", { nivelRiesgo: "ALTO" }],
    ["riesgo nulo", { nivelRiesgo: null }],
    ["ya presentada", { presentadaAt: A_TIEMPO }],
  ])("no_permitido: %s", async (_n, extra) => {
    h.lecturas = [exp(extra)];
    expect(await presentarSubsanacion(cliente, "e", A_TIEMPO)).toEqual({ status: "no_permitido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("vencido: pasado el último día, antes de revisar los archivos", async () => {
    h.lecturas = [exp()];
    expect(await presentarSubsanacion(cliente, "e", VENCIDO)).toEqual({ status: "vencido" });
    expect(h.lecturas).toHaveLength(0);
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("el último día todavía se puede presentar", async () => {
    h.lecturas = [exp(), dosDocs];
    const r = await presentarSubsanacion(cliente, "e", new Date("2026-11-02T20:00:00.000Z"));
    expect(r).toEqual({ status: "ok" });
  });

  it("incompleto: falta uno de los dos documentos", async () => {
    h.lecturas = [exp(), [dosDocs[0]]];
    expect(await presentarSubsanacion(cliente, "e", A_TIEMPO)).toEqual({ status: "incompleto" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("ok: un batch EN_SUBSANACION a EN_SUBSANACION con la fecha y el comentario", async () => {
    h.lecturas = [exp(), dosDocs];
    expect(await presentarSubsanacion(cliente, "e", A_TIEMPO)).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(1);
    expect(h.sets[0]).toMatchObject({ subsanacionPresentadaAt: A_TIEMPO });
    expect(h.sets[0]).not.toHaveProperty("estado");
    const [sentencias] = h.batch.mock.calls[0];
    expect(sentencias.map((s: { kind: string }) => s.kind)).toEqual(["update", "insert"]);
    expect(params(sentencias[1].q)).toEqual(
      expect.arrayContaining([
        "EN_SUBSANACION",
        "u3",
        "Subsanación presentada por el solicitante.",
      ]),
    );
  });

  it("conflicto: el UPDATE afecta 0 filas", async () => {
    h.lecturas = [exp(), dosDocs];
    h.actualizados = [];
    expect(await presentarSubsanacion(cliente, "e", A_TIEMPO)).toEqual({ status: "conflicto" });
  });
});

describe("evaluarSubsanacion", () => {
  const evaluar = (
    resultado: "CUMPLE" | "SIGUE_EN_SUBSANACION" | "NO_CUMPLE",
    ahora = A_TIEMPO,
    actor: typeof admin | typeof superadmin = admin,
    texto = informe,
  ) => evaluarSubsanacion(actor, "e", { resultado, informe: texto }, ahora);

  it("lanza para cliente", async () => {
    await expect(evaluar("CUMPLE", A_TIEMPO, cliente as never)).rejects.toThrow("No autorizado");
  });

  it("no_encontrado", async () => {
    h.lecturas = [[]];
    expect(await evaluar("CUMPLE")).toEqual({ status: "no_encontrado" });
  });

  it.each([
    ["otro estado", { estado: "DILIGENCIA_PROGRAMADA" }, "NO_CUMPLE"],
    ["riesgo nulo", { nivelRiesgo: null }, "NO_CUMPLE"],
    ["SIGUE en previa", { nivelRiesgo: "ALTO", presentadaAt: A_TIEMPO }, "SIGUE_EN_SUBSANACION"],
    ["resultado desconocido", {}, "ANULADO"],
  ])("no_permitido: %s", async (_n, extra, resultado) => {
    h.lecturas = [exp(extra)];
    expect(await evaluar(resultado as never)).toEqual({ status: "no_permitido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("motivo_requerido: informe corto tras recortar", async () => {
    h.lecturas = [exp({ presentadaAt: A_TIEMPO })];
    expect(await evaluar("CUMPLE", A_TIEMPO, admin, "  corto  ")).toEqual({ status: "motivo_requerido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it.each(["CUMPLE", "SIGUE_EN_SUBSANACION"] as const)(
    "sin_evidencia: %s en posterior sin presentar",
    async (resultado) => {
      h.lecturas = [exp()];
      expect(await evaluar(resultado)).toEqual({ status: "sin_evidencia" });
      h.lecturas = [exp()];
      expect(await evaluar(resultado, VENCIDO)).toEqual({ status: "sin_evidencia" });
      expect(h.batch).not.toHaveBeenCalled();
    },
  );

  it("plazo_vencido: SIGUE con evidencia presentada pero plazo vencido", async () => {
    h.lecturas = [exp({ presentadaAt: A_TIEMPO })];
    expect(await evaluar("SIGUE_EN_SUBSANACION", VENCIDO)).toEqual({ status: "plazo_vencido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("CUMPLE y NO_CUMPLE cambian el estado con el informe recortado", async () => {
    for (const [resultado, previo] of [
      ["CUMPLE", { presentadaAt: A_TIEMPO }],
      ["NO_CUMPLE", {}],
    ] as const) {
      h.batch.mockClear();
      h.sets = [];
      h.lecturas = [exp(previo)];
      expect(await evaluar(resultado, A_TIEMPO, admin, `  ${informe}  `)).toEqual({ status: "ok" });
      expect(h.batch).toHaveBeenCalledTimes(1);
      expect(h.sets[0]).toMatchObject({ estado: resultado });
      const [sentencias] = h.batch.mock.calls[0];
      expect(params(sentencias[1].q)).toEqual(
        expect.arrayContaining(["EN_SUBSANACION", resultado, "u1", informe]),
      );
    }
  });

  it("evidencia presentada a tiempo se evalúa aunque el plazo haya vencido", async () => {
    h.lecturas = [exp({ presentadaAt: A_TIEMPO })];
    expect(await evaluar("CUMPLE", VENCIDO)).toEqual({ status: "ok" });
  });

  it("SIGUE mantiene el estado y limpia la presentación", async () => {
    h.lecturas = [exp({ presentadaAt: A_TIEMPO })];
    expect(await evaluar("SIGUE_EN_SUBSANACION")).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(1);
    expect(h.sets[0]).toMatchObject({ subsanacionPresentadaAt: null });
    expect(h.sets[0]).not.toHaveProperty("estado");
    const [sentencias] = h.batch.mock.calls[0];
    expect(params(sentencias[1].q)).toEqual(
      expect.arrayContaining(["EN_SUBSANACION", "u1", informe]),
    );
  });

  it("previa: CUMPLE y NO_CUMPLE sin evidencia, incluso vencido", async () => {
    for (const resultado of ["CUMPLE", "NO_CUMPLE"] as const) {
      h.lecturas = [exp({ nivelRiesgo: "MUY_ALTO" })];
      expect(await evaluar(resultado, VENCIDO, superadmin)).toEqual({ status: "ok" });
    }
  });

  it("conflicto: el UPDATE afecta 0 filas", async () => {
    h.lecturas = [exp()];
    h.actualizados = [];
    expect(await evaluar("NO_CUMPLE")).toEqual({ status: "conflicto" });
  });

  it("coincide con opcionesEvaluacion en las combinaciones de posterior", async () => {
    for (const presentada of [false, true]) {
      for (const ahora of [A_TIEMPO, VENCIDO]) {
        const permitidas = opcionesEvaluacion({
          tipoItse: "POSTERIOR",
          presentada,
          vencido: ahora === VENCIDO,
        });
        for (const resultado of ["CUMPLE", "SIGUE_EN_SUBSANACION", "NO_CUMPLE"] as const) {
          h.lecturas = [exp({ presentadaAt: presentada ? A_TIEMPO : null })];
          const r = await evaluar(resultado, ahora);
          expect(r.status === "ok", `${resultado} presentada=${presentada}`).toBe(
            permitidas.includes(resultado),
          );
        }
      }
    }
  });
});
