import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

type Fila = { id: string; codigo: string; descripcion: string; activo: boolean };
type Op = { kind: "insert" | "update"; table: unknown; v?: Record<string, unknown>; w?: unknown };

const h = vi.hoisted(() => ({
  store: [] as { id: string; codigo: string; descripcion: string; activo: boolean }[],
  batch: vi.fn(),
  fallas: [] as unknown[],
  selects: 0,
  tablasEscritas: [] as string[],
}));

const param0 = (w: unknown) => new PgDialect().sqlToQuery(w as never).params[0] as string;

// BD simulada en memoria: el batch aplica sus operaciones solo si no falla.
vi.mock("@/db", async () => {
  const { catalogoObservaciones, configuracionAuditoria } = await import("@/db/schema");
  const select = () => {
    h.selects++;
    let soloActivas = false;
    const c: Record<string, unknown> = {};
    c.from = () => c;
    c.where = () => {
      soloActivas = true;
      return c;
    };
    c.orderBy = () => c;
    c.then = (res: (v: unknown) => unknown) =>
      res(
        h.store
          .filter((f) => !soloActivas || f.activo)
          .map((f) => ({ ...f }))
          .sort((a, b) => a.descripcion.localeCompare(b.descripcion)),
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
      batch: async (ops: Op[]) => {
        h.batch(ops);
        const falla = h.fallas.shift();
        if (falla) throw falla;
        for (const op of ops) {
          if (op.table === configuracionAuditoria) h.tablasEscritas.push("auditoria");
          if (op.table !== catalogoObservaciones) continue;
          h.tablasEscritas.push("catalogo");
          if (op.kind === "insert") h.store.push({ activo: true, ...(op.v as Omit<Fila, "activo">) });
          if (op.kind === "update") h.store.forEach((f) => f.id === param0(op.w) && Object.assign(f, op.v));
        }
        return [];
      },
    },
  };
});

import { catalogoObservaciones, configuracionAuditoria } from "@/db/schema";
import { getCatalogoActivo } from "@/modules/configuracion/services/catalogo-lectura.service";
import {
  crearObservacion,
  editarObservacion,
  setObservacionActiva,
} from "@/modules/configuracion/services/catalogo-gestion.service";
import { evaluarObservaciones } from "@/modules/inspecciones/utils/observaciones";

const superadmin = { id: "s1", rol: "superadmin" as const };
const ID = "3f1b2c4e-5a6d-4e8f-9a0b-1c2d3e4f5a6b";
const extintores = {
  id: ID,
  codigo: "EXTINTORES",
  descripcion: "Instalar, recargar o reubicar extintores.",
  activo: true,
};
const ERROR_GENERICO = "No se pudo guardar el cambio. Inténtalo de nuevo.";
const DUPLICADO = "Ya existe una observación con esa descripción.";
const NO_ENCONTRADO = "No se encontró la observación.";
const SIN_CAMBIOS = "No hay cambios que guardar.";
const dup = () => Object.assign(new Error("dup"), { code: "23505" });

beforeEach(() => {
  h.store = [{ ...extintores }];
  h.batch.mockClear();
  h.fallas = [];
  h.selects = 0;
  h.tablasEscritas = [];
});

describe("autorización", () => {
  it.each(["admin", "cliente"] as const)("%s lanza sin tocar la BD", async (rol) => {
    const actor = { id: "x", rol };
    await expect(crearObservacion(actor, "Una descripción larga")).rejects.toThrow("No autorizado");
    await expect(editarObservacion(actor, ID, "Otra descripción larga")).rejects.toThrow("No autorizado");
    await expect(setObservacionActiva(actor, ID, false)).rejects.toThrow("No autorizado");
    expect(h.selects).toBe(0);
    expect(h.batch).not.toHaveBeenCalled();
  });
});

describe("crearObservacion", () => {
  const texto = "Retirar cajas de la salida";

  it("un solo batch con el alta y la auditoría, con código generado", async () => {
    const r = await crearObservacion(superadmin, texto);
    expect(r.ok && r.data).toMatchObject({ descripcion: texto, activo: true });
    expect(h.batch).toHaveBeenCalledTimes(1);
    const [cambio, auditoria] = h.batch.mock.calls[0][0] as Op[];
    expect(cambio).toMatchObject({
      kind: "insert",
      table: catalogoObservaciones,
      v: { codigo: "RETIRAR_CAJAS_DE_LA_SALIDA", descripcion: texto },
    });
    expect(auditoria).toMatchObject({ kind: "insert", table: configuracionAuditoria });
    expect(auditoria.v).toEqual({
      actorId: "s1",
      entidad: "OBSERVACION",
      accion: "CREAR",
      referencia: "RETIRAR_CAJAS_DE_LA_SALIDA",
      valorAnterior: null,
      valorNuevo: texto,
    });
  });

  it("descripción repetida (sin distinguir mayúsculas, tildes ni espacios), activa o no", async () => {
    expect(await crearObservacion(superadmin, "INSTALAR,  recargar o reubicar   extintores.")).toEqual({
      ok: false,
      error: DUPLICADO,
    });
    h.store[0].activo = false;
    expect((await crearObservacion(superadmin, extintores.descripcion)).ok).toBe(false);
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("si el código ya existe agrega sufijo", async () => {
    h.store = [{ ...extintores, codigo: "RETIRAR_CAJAS_DE_LA_SALIDA", descripcion: "Otra cosa distinta" }];
    await crearObservacion(superadmin, texto);
    expect((h.batch.mock.calls[0][0] as Op[])[0].v).toMatchObject({ codigo: "RETIRAR_CAJAS_DE_LA_SALIDA_2" });
  });

  it("choque de código (carrera): reintenta y termina bien", async () => {
    h.fallas = [dup(), Object.assign(new Error("dup"), { cause: { code: "23505" } })];
    expect((await crearObservacion(superadmin, texto)).ok).toBe(true);
    expect(h.batch).toHaveBeenCalledTimes(3);
  });

  it("tras 5 choques seguidos devuelve el error genérico", async () => {
    h.fallas = Array.from({ length: 5 }, dup);
    expect(await crearObservacion(superadmin, texto)).toEqual({ ok: false, error: ERROR_GENERICO });
    expect(h.batch).toHaveBeenCalledTimes(5);
  });

  it("si el lote falla: error y no queda ninguna escritura", async () => {
    h.fallas = [new Error("boom")];
    expect(await crearObservacion(superadmin, texto)).toEqual({ ok: false, error: ERROR_GENERICO });
    expect(h.store).toHaveLength(1);
    expect(h.tablasEscritas).toEqual([]);
  });
});

describe("editarObservacion", () => {
  it("cambia la descripción y audita con anterior y nueva, referencia = código", async () => {
    const nueva = "Instalar o recargar los extintores";
    const r = await editarObservacion(superadmin, ID, nueva);
    expect(r).toEqual({ ok: true, data: { id: ID, descripcion: nueva, activo: true } });
    const [cambio, auditoria] = h.batch.mock.calls[0][0] as Op[];
    expect(cambio).toMatchObject({ kind: "update", table: catalogoObservaciones, v: { descripcion: nueva } });
    expect(cambio.v).not.toHaveProperty("codigo");
    expect(auditoria.v).toEqual({
      actorId: "s1",
      entidad: "OBSERVACION",
      accion: "EDITAR",
      referencia: "EXTINTORES",
      valorAnterior: extintores.descripcion,
      valorNuevo: nueva,
    });
  });

  it("id inexistente: no encontrada", async () => {
    expect(await editarObservacion(superadmin, "otro", "Una descripción larga")).toEqual({
      ok: false,
      error: NO_ENCONTRADO,
    });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("misma descripción: sin cambios y no audita", async () => {
    expect(await editarObservacion(superadmin, ID, extintores.descripcion)).toEqual({
      ok: false,
      error: SIN_CAMBIOS,
    });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("descripción de otra observación: duplicada", async () => {
    h.store.push({ id: "2", codigo: "OTRA", descripcion: "Colocar señalización de salida", activo: false });
    expect(await editarObservacion(superadmin, ID, "colocar SEÑALIZACIÓN de  salida")).toEqual({
      ok: false,
      error: DUPLICADO,
    });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("solo cambia mayúsculas de la propia: permitido", async () => {
    expect((await editarObservacion(superadmin, ID, extintores.descripcion.toUpperCase())).ok).toBe(true);
  });

  it("si el lote falla: error y todo sigue igual", async () => {
    h.fallas = [new Error("boom")];
    expect((await editarObservacion(superadmin, ID, "Una descripción nueva")).ok).toBe(false);
    expect(h.store[0].descripcion).toBe(extintores.descripcion);
  });
});

describe("setObservacionActiva", () => {
  it("desactiva y audita DESACTIVAR con la descripción en ambos valores", async () => {
    expect(await setObservacionActiva(superadmin, ID, false)).toEqual({
      ok: true,
      data: { id: ID, descripcion: extintores.descripcion, activo: false },
    });
    expect(h.batch).toHaveBeenCalledTimes(1);
    const [cambio, auditoria] = h.batch.mock.calls[0][0] as Op[];
    expect(cambio).toMatchObject({ kind: "update", v: { activo: false } });
    expect(auditoria.v).toEqual({
      actorId: "s1",
      entidad: "OBSERVACION",
      accion: "DESACTIVAR",
      referencia: "EXTINTORES",
      valorAnterior: extintores.descripcion,
      valorNuevo: extintores.descripcion,
    });
  });

  it("reactiva con ACTIVAR", async () => {
    h.store[0].activo = false;
    await setObservacionActiva(superadmin, ID, true);
    expect((h.batch.mock.calls[0][0] as Op[])[1].v).toMatchObject({ accion: "ACTIVAR" });
  });

  it("id inexistente y mismo estado", async () => {
    expect(await setObservacionActiva(superadmin, "otro", false)).toEqual({ ok: false, error: NO_ENCONTRADO });
    expect(await setObservacionActiva(superadmin, ID, true)).toEqual({ ok: false, error: SIN_CAMBIOS });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("si el lote falla: error y sigue activa", async () => {
    h.fallas = [new Error("boom")];
    expect(await setObservacionActiva(superadmin, ID, false)).toEqual({ ok: false, error: ERROR_GENERICO });
    expect(h.store[0].activo).toBe(true);
  });
});

describe("consistencia con la diligencia", () => {
  const evaluar = async (codigo: string) =>
    evaluarObservaciones("POSTERIOR", { codigos: [codigo], libres: [] }, await getCatalogoActivo());

  it("creada aparece y se acepta; desactivada se rechaza; reactivada vuelve", async () => {
    const r = await crearObservacion(superadmin, "Retirar cajas de la salida");
    const id = r.ok ? r.data.id : "";
    const codigo = "RETIRAR_CAJAS_DE_LA_SALIDA";
    expect((await getCatalogoActivo()).map((o) => o.codigo)).toContain(codigo);
    expect(await evaluar(codigo)).toEqual({ ok: true });

    await setObservacionActiva(superadmin, id, false);
    expect((await getCatalogoActivo()).map((o) => o.codigo)).not.toContain(codigo);
    expect(await evaluar(codigo)).toEqual({ ok: false, motivo: "codigo_invalido" });

    await setObservacionActiva(superadmin, id, true);
    expect(await evaluar(codigo)).toEqual({ ok: true });
  });

  it("el servicio solo escribe en el catálogo y su auditoría, nunca en observaciones_diligencia", async () => {
    await crearObservacion(superadmin, "Retirar cajas de la salida");
    await editarObservacion(superadmin, ID, "Una descripción nueva");
    await setObservacionActiva(superadmin, ID, false);
    expect(new Set(h.tablasEscritas)).toEqual(new Set(["catalogo", "auditoria"]));
  });
});
