import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

type Op = { kind: "insert" | "update"; table: unknown; v: Record<string, unknown>; w?: unknown };

const h = vi.hoisted(() => ({
  store: [] as { tipoItse: string; montoCentimos: number }[],
  batch: vi.fn(),
  falla: null as unknown,
  selects: 0,
  updates: [] as unknown[],
}));

const param0 = (w: unknown) => new PgDialect().sqlToQuery(w as never).params[0] as string;

// BD simulada en memoria: el batch aplica sus operaciones solo si no falla.
vi.mock("@/db", async () => {
  const { tasas } = await import("@/db/schema");
  return {
    db: {
      select: () => {
        h.selects++;
        return { from: () => Promise.resolve(h.store.map((f) => ({ ...f }))) };
      },
      insert: (table: unknown) => ({ values: (v: Op["v"]) => ({ kind: "insert", table, v }) }),
      update: (table: unknown) => {
        h.updates.push(table);
        return { set: (v: Op["v"]) => ({ where: (w: unknown) => ({ kind: "update", table, v, w }) }) };
      },
      batch: async (ops: Op[]) => {
        h.batch(ops);
        if (h.falla) throw h.falla;
        for (const op of ops) {
          if (op.table === tasas && op.kind === "update") {
            h.store.forEach((f) => f.tipoItse === param0(op.w) && (f.montoCentimos = op.v.montoCentimos as number));
          }
        }
        return [];
      },
    },
  };
});

import { configuracionAuditoria, tasas } from "@/db/schema";
import { guardarTasas, listTasas } from "@/modules/configuracion/services/tasa-gestion.service";
import { getTasas } from "@/modules/configuracion/services/tasa-lectura.service";
import { montoTasa } from "@/modules/expedientes/constants/tasa";

const superadmin = { id: "s1", rol: "superadmin" as const };

beforeEach(() => {
  h.store = [
    { tipoItse: "POSTERIOR", montoCentimos: 15000 },
    { tipoItse: "PREVIA", montoCentimos: 30000 },
  ];
  h.batch.mockClear();
  h.falla = null;
  h.selects = 0;
  h.updates = [];
});

describe("autorización", () => {
  it.each(["admin", "cliente"] as const)("%s lanza sin tocar la BD", async (rol) => {
    const actor = { id: "x", rol };
    await expect(guardarTasas(actor, { posterior: 16000, previa: 30000 })).rejects.toThrow("No autorizado");
    await expect(listTasas(actor)).rejects.toThrow("No autorizado");
    expect(h.selects).toBe(0);
    expect(h.batch).not.toHaveBeenCalled();
  });
});

describe("listTasas", () => {
  it("devuelve los montos vigentes", async () => {
    expect(await listTasas(superadmin)).toEqual({ POSTERIOR: 15000, PREVIA: 30000 });
  });
});

describe("guardarTasas", () => {
  it("sin cambios: no escribe ni audita", async () => {
    expect(await guardarTasas(superadmin, { posterior: 15000, previa: 30000 })).toEqual({
      ok: false,
      error: "No hay cambios que guardar.",
    });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("un monto cambiado: un solo batch con el UPDATE y una fila de auditoría", async () => {
    const r = await guardarTasas(superadmin, { posterior: 16000, previa: 30000 });
    expect(r).toEqual({ ok: true, data: { POSTERIOR: 16000, PREVIA: 30000 } });
    expect(h.batch).toHaveBeenCalledTimes(1);
    const ops = h.batch.mock.calls[0][0] as Op[];
    expect(ops).toHaveLength(2);
    expect(ops[0]).toMatchObject({ kind: "update", table: tasas, v: { montoCentimos: 16000 } });
    expect(ops[1]).toMatchObject({ kind: "insert", table: configuracionAuditoria });
    expect(ops[1].v).toEqual({
      actorId: "s1",
      entidad: "TASA",
      accion: "EDITAR",
      referencia: "POSTERIOR",
      valorAnterior: "15000",
      valorNuevo: "16000",
    });
  });

  it("ambos cambiados: una fila de auditoría por tipo en el mismo batch", async () => {
    await guardarTasas(superadmin, { posterior: 16000, previa: 31000 });
    expect(h.batch).toHaveBeenCalledTimes(1);
    const ops = h.batch.mock.calls[0][0] as Op[];
    expect(ops.filter((o) => o.table === configuracionAuditoria).map((o) => o.v.referencia)).toEqual([
      "POSTERIOR",
      "PREVIA",
    ]);
  });

  it("si el lote falla: error y no queda ninguna escritura", async () => {
    h.falla = new Error("boom");
    expect(await guardarTasas(superadmin, { posterior: 16000, previa: 31000 })).toEqual({
      ok: false,
      error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
    });
    expect(h.store.map((f) => f.montoCentimos)).toEqual([15000, 30000]);
  });

  it("solo actualiza la tabla de tasas (nunca expedientes) y getTasas ve los nuevos montos", async () => {
    await guardarTasas(superadmin, { posterior: 16000, previa: 31000 });
    expect(h.updates.every((t) => t === tasas)).toBe(true);
    const nuevas = await getTasas();
    expect(nuevas).toEqual({ POSTERIOR: 16000, PREVIA: 31000 });
    expect(montoTasa("BAJO", nuevas)).toBe(16000);
    expect(montoTasa("ALTO", nuevas)).toBe(31000);
  });
});
