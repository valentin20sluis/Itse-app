import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

type Fila = { fecha: string; nombre: string };
type Op = { kind: "insert" | "update" | "delete"; table: unknown; v?: Record<string, unknown>; w?: unknown };

const h = vi.hoisted(() => ({
  store: [] as { fecha: string; nombre: string }[],
  batch: vi.fn(),
  falla: null as unknown,
  selects: 0,
}));

const param0 = (w: unknown) => new PgDialect().sqlToQuery(w as never).params[0] as string;

// BD simulada en memoria: el batch aplica sus operaciones solo si no falla.
vi.mock("@/db", async () => {
  const { feriados } = await import("@/db/schema");
  const select = () => {
    h.selects++;
    let filtro: string | null = null;
    const c: Record<string, unknown> = {};
    c.from = () => c;
    c.orderBy = () => c;
    c.limit = () => c;
    c.where = (w: unknown) => {
      filtro = param0(w);
      return c;
    };
    c.then = (res: (v: unknown) => unknown) =>
      res(
        [...h.store]
          .filter((f) => filtro === null || f.fecha === filtro)
          .sort((a, b) => a.fecha.localeCompare(b.fecha)),
      );
    return c;
  };
  return {
    db: {
      select,
      insert: (table: unknown) => ({ values: (v: Op["v"]) => ({ kind: "insert", table, v }) }),
      update: (table: unknown) => ({
        set: (v: Op["v"]) => ({ where: (w: unknown) => ({ kind: "update", table, v, w }) }),
      }),
      delete: (table: unknown) => ({ where: (w: unknown) => ({ kind: "delete", table, w }) }),
      batch: async (ops: Op[]) => {
        h.batch(ops);
        if (h.falla) throw h.falla;
        for (const op of ops) {
          if (op.table !== feriados) continue;
          if (op.kind === "insert") h.store.push(op.v as Fila);
          if (op.kind === "update") h.store.forEach((f) => f.fecha === param0(op.w) && Object.assign(f, op.v));
          if (op.kind === "delete") h.store = h.store.filter((f) => f.fecha !== param0(op.w));
        }
        return [];
      },
    },
  };
});

import { configuracionAuditoria, feriados } from "@/db/schema";
import { getFeriados } from "@/modules/configuracion/services/feriado-lectura.service";
import {
  crearFeriado,
  editarFeriado,
  eliminarFeriado,
  listFeriados,
} from "@/modules/configuracion/services/feriado-gestion.service";
import { calcularLimiteSubsanacion } from "@/modules/inspecciones/utils/plazo-subsanacion";

const superadmin = { id: "s1", rol: "superadmin" as const };
const navidad = { fecha: "2026-12-25", nombre: "Navidad" };
const ERROR_GENERICO = "No se pudo guardar el cambio. Inténtalo de nuevo.";
const DUPLICADO = "Ya existe un feriado en esa fecha.";

beforeEach(() => {
  h.store = [{ ...navidad }];
  h.batch.mockClear();
  h.falla = null;
  h.selects = 0;
});

describe("autorización", () => {
  it.each(["admin", "cliente"] as const)("%s lanza sin tocar la BD", async (rol) => {
    const actor = { id: "x", rol };
    await expect(crearFeriado(actor, navidad)).rejects.toThrow("No autorizado");
    await expect(editarFeriado(actor, navidad.fecha, "Otro")).rejects.toThrow("No autorizado");
    await expect(eliminarFeriado(actor, navidad.fecha)).rejects.toThrow("No autorizado");
    await expect(listFeriados(actor)).rejects.toThrow("No autorizado");
    expect(h.selects).toBe(0);
    expect(h.batch).not.toHaveBeenCalled();
  });
});

describe("listFeriados", () => {
  it("devuelve fecha y nombre ordenados", async () => {
    h.store = [
      { fecha: "2026-12-25", nombre: "Navidad" },
      { fecha: "2026-01-01", nombre: "Año Nuevo" },
    ];
    expect((await listFeriados(superadmin)).map((f) => f.fecha)).toEqual(["2026-01-01", "2026-12-25"]);
  });
});

describe("crearFeriado", () => {
  const nuevo = { fecha: "2026-10-30", nombre: "Día de prueba" };

  it("un solo batch con el cambio y la auditoría", async () => {
    expect(await crearFeriado(superadmin, nuevo)).toEqual({ ok: true, data: nuevo });
    expect(h.batch).toHaveBeenCalledTimes(1);
    const [cambio, auditoria] = h.batch.mock.calls[0][0] as Op[];
    expect(cambio).toMatchObject({ kind: "insert", table: feriados, v: nuevo });
    expect(auditoria).toMatchObject({ kind: "insert", table: configuracionAuditoria });
    expect(auditoria.v).toEqual({
      actorId: "s1",
      entidad: "FERIADO",
      accion: "CREAR",
      referencia: nuevo.fecha,
      valorAnterior: null,
      valorNuevo: nuevo.nombre,
    });
  });

  it("fecha existente: error sin escribir", async () => {
    expect(await crearFeriado(superadmin, navidad)).toEqual({ ok: false, error: DUPLICADO });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("clave duplicada en el lote (carrera) se trata como duplicado", async () => {
    h.falla = Object.assign(new Error("dup"), { code: "23505" });
    expect(await crearFeriado(superadmin, nuevo)).toEqual({ ok: false, error: DUPLICADO });
    h.falla = Object.assign(new Error("dup"), { cause: { code: "23505" } });
    expect(await crearFeriado(superadmin, nuevo)).toEqual({ ok: false, error: DUPLICADO });
  });

  it("si el lote falla: error y no queda ninguna escritura", async () => {
    h.falla = new Error("boom");
    expect(await crearFeriado(superadmin, nuevo)).toEqual({ ok: false, error: ERROR_GENERICO });
    expect(h.store).toEqual([navidad]);
  });
});

describe("editarFeriado", () => {
  it("renombra y audita en un solo batch con anterior y nuevo", async () => {
    expect(await editarFeriado(superadmin, navidad.fecha, "Navidad del Señor")).toEqual({
      ok: true,
      data: { fecha: navidad.fecha, nombre: "Navidad del Señor" },
    });
    const [cambio, auditoria] = h.batch.mock.calls[0][0] as Op[];
    expect(cambio).toMatchObject({ kind: "update", table: feriados, v: { nombre: "Navidad del Señor" } });
    expect(auditoria.v).toMatchObject({
      accion: "EDITAR",
      referencia: navidad.fecha,
      valorAnterior: "Navidad",
      valorNuevo: "Navidad del Señor",
    });
  });

  it("fecha inexistente: no encontrado", async () => {
    expect(await editarFeriado(superadmin, "2026-01-02", "X Y Z")).toEqual({
      ok: false,
      error: "No se encontró el feriado.",
    });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("mismo nombre: sin cambios y no audita", async () => {
    expect(await editarFeriado(superadmin, navidad.fecha, "Navidad")).toEqual({
      ok: false,
      error: "No hay cambios que guardar.",
    });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("si el lote falla: error", async () => {
    h.falla = new Error("boom");
    expect((await editarFeriado(superadmin, navidad.fecha, "Otro")).ok).toBe(false);
    expect(h.store[0].nombre).toBe("Navidad");
  });
});

describe("eliminarFeriado", () => {
  it("elimina y audita con valor nuevo nulo", async () => {
    expect(await eliminarFeriado(superadmin, navidad.fecha)).toEqual({ ok: true, data: navidad });
    const [cambio, auditoria] = h.batch.mock.calls[0][0] as Op[];
    expect(cambio).toMatchObject({ kind: "delete", table: feriados });
    expect(auditoria.v).toMatchObject({ accion: "ELIMINAR", valorAnterior: "Navidad", valorNuevo: null });
  });

  it("fecha inexistente: no encontrado", async () => {
    expect(await eliminarFeriado(superadmin, "2026-01-02")).toEqual({
      ok: false,
      error: "No se encontró el feriado.",
    });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("si el lote falla: error y el feriado sigue", async () => {
    h.falla = new Error("boom");
    expect((await eliminarFeriado(superadmin, navidad.fecha)).ok).toBe(false);
    expect(h.store).toHaveLength(1);
  });
});

describe("consistencia con los plazos", () => {
  const suspendida = new Date("2026-10-28T15:00:00Z");
  const limite = async () => calcularLimiteSubsanacion("POSTERIOR", suspendida, await getFeriados()).toISOString();

  it("un feriado nuevo se salta en el cálculo y deja de saltarse al eliminarlo", async () => {
    h.store = [];
    expect(await limite()).toBe("2026-11-02T05:00:00.000Z");
    await crearFeriado(superadmin, { fecha: "2026-10-30", nombre: "Día de prueba" });
    expect(await getFeriados()).toEqual(["2026-10-30"]);
    expect(await limite()).toBe("2026-11-03T05:00:00.000Z");
    await eliminarFeriado(superadmin, "2026-10-30");
    expect(await getFeriados()).toEqual([]);
    expect(await limite()).toBe("2026-11-02T05:00:00.000Z");
  });
});
