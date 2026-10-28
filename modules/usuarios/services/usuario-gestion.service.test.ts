import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const m = vi.hoisted(() => ({
  queue: [] as unknown[],
  updateUserMetadata: vi.fn(),
  returning: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
  values: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({ users: { updateUserMetadata: m.updateUserMetadata } }),
}));

vi.mock("@/db", () => {
  const select = (): unknown =>
    new Proxy(
      {},
      {
        get: (_t, p) => (p === "then" ? (res: (v: unknown) => void) => res(m.queue.shift()) : () => select()),
      },
    );
  return {
    db: {
      select,
      update: () => ({
        set: (s: unknown) => {
          m.set(s);
          return {
            where: (w: unknown) => {
              m.where(w);
              return { returning: m.returning };
            },
          };
        },
      }),
      insert: () => ({ values: m.values }),
    },
  };
});

import { cambiarRol, setActivo } from "./usuario-gestion.service";

const superadmin = { id: "s1", rol: "superadmin" as const };
const ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";
const dialect = new PgDialect();

const destino = (rol: string, activo = true, id = ID) => [{ id, clerkId: "clerk_x", rol, activo }];
const lecturas = (d: unknown[], superadmins = 2) => m.queue.push(d, [{ n: superadmins }]);

beforeEach(() => {
  vi.resetAllMocks();
  m.queue.length = 0;
  m.updateUserMetadata.mockResolvedValue(undefined);
  m.returning.mockResolvedValue([{ id: ID }]);
  m.values.mockResolvedValue(undefined);
});

describe("autorización", () => {
  it("admin y cliente lanzan sin tocar Clerk ni BD", async () => {
    for (const rol of ["admin", "cliente"] as const) {
      await expect(cambiarRol({ id: "x", rol }, ID, "admin")).rejects.toThrow("No autorizado");
      await expect(setActivo({ id: "x", rol }, ID, false)).rejects.toThrow("No autorizado");
    }
    expect(m.updateUserMetadata).not.toHaveBeenCalled();
    expect(m.returning).not.toHaveBeenCalled();
    expect(m.queue).toHaveLength(0);
  });
});

describe("cambiarRol", () => {
  it("destino inexistente: error sin llamar a Clerk", async () => {
    m.queue.push([]);
    expect(await cambiarRol(superadmin, ID, "admin")).toEqual({ ok: false, error: "No se encontró el usuario." });
    expect(m.updateUserMetadata).not.toHaveBeenCalled();
  });

  it("sobre uno mismo: error sin Clerk ni escritura", async () => {
    lecturas(destino("superadmin", true, "s1"));
    expect(await cambiarRol(superadmin, "s1", "admin")).toEqual({
      ok: false,
      error: "No puedes modificar tu propia cuenta.",
    });
    expect(m.updateUserMetadata).not.toHaveBeenCalled();
    expect(m.returning).not.toHaveBeenCalled();
  });

  it("éxito: Clerk con el clerkId de la BD antes del update, y después la auditoría", async () => {
    lecturas(destino("cliente"));
    const r = await cambiarRol(superadmin, ID, "admin");
    expect(r).toEqual({ ok: true, data: { id: ID, rol: "admin", activo: true } });
    expect(m.updateUserMetadata).toHaveBeenCalledTimes(1);
    expect(m.updateUserMetadata).toHaveBeenCalledWith("clerk_x", { publicMetadata: { role: "admin" } });
    const orden = (f: { mock: { invocationCallOrder: number[] } }) => f.mock.invocationCallOrder[0];
    expect(orden(m.updateUserMetadata)).toBeLessThan(orden(m.returning));
    expect(orden(m.returning)).toBeLessThan(orden(m.values));
    expect(m.values).toHaveBeenCalledWith({
      usuarioId: ID,
      actorId: "s1",
      accion: "CAMBIO_ROL",
      valorAnterior: "cliente",
      valorNuevo: "admin",
    });
  });

  it("degradar a un jefe incluye la condición de conteo en el UPDATE; a un cliente no", async () => {
    lecturas(destino("superadmin"));
    await cambiarRol(superadmin, ID, "admin");
    const q = dialect.sqlToQuery(m.where.mock.calls[0][0]);
    expect(q.sql).toContain("select count(*)");
    expect(q.sql).toMatch(/\(select count\(\*\) from \(select .* for update\) s\) > 1/);
    expect(q.params).toEqual(expect.arrayContaining([ID, "superadmin", true]));
    expect(q.sql).not.toContain("superadmin");

    m.queue.length = 0;
    m.where.mockClear();
    lecturas(destino("cliente"));
    await cambiarRol(superadmin, ID, "admin");
    expect(dialect.sqlToQuery(m.where.mock.calls[0][0]).sql).not.toContain("select count(*)");
  });

  it("último jefe activo: error sin Clerk", async () => {
    lecturas(destino("superadmin"), 1);
    expect(await cambiarRol(superadmin, ID, "admin")).toEqual({
      ok: false,
      error: "Debe quedar al menos un jefe activo.",
    });
    expect(m.updateUserMetadata).not.toHaveBeenCalled();
  });

  it("falla Clerk: error, sin update ni auditoría", async () => {
    lecturas(destino("cliente"));
    m.updateUserMetadata.mockRejectedValue(new Error("clerk down"));
    const r = await cambiarRol(superadmin, ID, "admin");
    expect(r.ok).toBe(false);
    expect(m.returning).not.toHaveBeenCalled();
    expect(m.values).not.toHaveBeenCalled();
  });

  it("0 filas: restaura el rol anterior en Clerk y devuelve conflicto", async () => {
    lecturas(destino("superadmin"));
    m.returning.mockResolvedValue([]);
    const r = await cambiarRol(superadmin, ID, "admin");
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("al mismo tiempo") });
    expect(m.updateUserMetadata).toHaveBeenCalledTimes(2);
    expect(m.updateUserMetadata).toHaveBeenLastCalledWith("clerk_x", { publicMetadata: { role: "superadmin" } });
    expect(m.values).not.toHaveBeenCalled();
  });

  it("el update lanza: restaura en Clerk y devuelve error", async () => {
    lecturas(destino("cliente"));
    m.returning.mockRejectedValue(new Error("db"));
    const r = await cambiarRol(superadmin, ID, "admin");
    expect(r.ok).toBe(false);
    expect(m.updateUserMetadata).toHaveBeenLastCalledWith("clerk_x", { publicMetadata: { role: "cliente" } });
  });

  it("falla también la restauración: mensaje de cambio incompleto", async () => {
    lecturas(destino("cliente"));
    m.returning.mockResolvedValue([]);
    m.updateUserMetadata.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("x"));
    expect(await cambiarRol(superadmin, ID, "admin")).toEqual({
      ok: false,
      error: "El cambio no se completó del todo. Revisa el rol del usuario.",
    });
  });

  it("si falla la auditoría el cambio se mantiene", async () => {
    lecturas(destino("cliente"));
    m.values.mockRejectedValue(new Error("db"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await cambiarRol(superadmin, ID, "admin")).ok).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("setActivo", () => {
  it("desactiva sin llamar a Clerk y audita", async () => {
    lecturas(destino("admin"));
    const r = await setActivo(superadmin, ID, false);
    expect(r).toEqual({ ok: true, data: { id: ID, rol: "admin", activo: false } });
    expect(m.updateUserMetadata).not.toHaveBeenCalled();
    expect(m.values).toHaveBeenCalledWith({
      usuarioId: ID,
      actorId: "s1",
      accion: "DESACTIVACION",
      valorAnterior: "activo",
      valorNuevo: "inactivo",
    });
  });

  it("reactiva y audita ACTIVACION", async () => {
    lecturas(destino("admin", false));
    expect((await setActivo(superadmin, ID, true)).ok).toBe(true);
    expect(m.values).toHaveBeenCalledWith(expect.objectContaining({ accion: "ACTIVACION" }));
  });

  it("sobre uno mismo y último jefe se rechazan sin escribir", async () => {
    lecturas(destino("superadmin", true, "s1"));
    expect(await setActivo(superadmin, "s1", false)).toEqual({
      ok: false,
      error: "No puedes modificar tu propia cuenta.",
    });
    lecturas(destino("superadmin"), 1);
    expect(await setActivo(superadmin, ID, false)).toEqual({
      ok: false,
      error: "Debe quedar al menos un jefe activo.",
    });
    expect(m.returning).not.toHaveBeenCalled();
  });

  it("desactivar un jefe con otro activo procede e incluye la condición de conteo", async () => {
    lecturas(destino("superadmin"), 2);
    expect((await setActivo(superadmin, ID, false)).ok).toBe(true);
    const q = dialect.sqlToQuery(m.where.mock.calls[0][0]);
    expect(q.sql).toContain("select count(*)");
    expect(q.sql).toMatch(/\(select count\(\*\) from \(select .* for update\) s\) > 1/);
    expect(q.params).toEqual(expect.arrayContaining([ID, "superadmin", true]));
  });

  it("0 filas se trata como conflicto sin auditoría", async () => {
    lecturas(destino("superadmin"), 2);
    m.returning.mockResolvedValue([]);
    const r = await setActivo(superadmin, ID, false);
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("al mismo tiempo") });
    expect(m.values).not.toHaveBeenCalled();
  });

  it("destino inexistente", async () => {
    m.queue.push([]);
    expect(await setActivo(superadmin, ID, false)).toEqual({ ok: false, error: "No se encontró el usuario." });
  });
});
