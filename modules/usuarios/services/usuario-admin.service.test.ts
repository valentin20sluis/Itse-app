import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const h = vi.hoisted(() => ({ queue: [] as unknown[], wheres: [] as unknown[] }));

vi.mock("@/db", () => {
  // Cada consulta es un encadenable que se resuelve con el siguiente resultado de la cola.
  const chain = (): unknown =>
    new Proxy(
      {},
      {
        get: (_t, prop) => {
          if (prop === "then") return (res: (v: unknown) => void) => res(h.queue.shift());
          if (prop === "where") {
            return (w: unknown) => {
              h.wheres.push(w);
              return chain();
            };
          }
          return () => chain();
        },
      },
    );
  return { db: { select: () => chain() } };
});

import { escapeLike, getUsuarioDetalle, listUsuarios } from "./usuario-admin.service";

const superadmin = { id: "s1", rol: "superadmin" as const };
const admin = { id: "a1", rol: "admin" as const };
const cliente = { id: "c1", rol: "cliente" as const };
const filtros = { q: "", rol: undefined, estado: undefined, pagina: 1 };
const dialect = new PgDialect();

beforeEach(() => {
  h.queue.length = 0;
  h.wheres.length = 0;
});

describe("autorización", () => {
  it("rechaza admin y cliente en ambas funciones sin consultar", async () => {
    for (const actor of [admin, cliente]) {
      await expect(listUsuarios(actor, filtros)).rejects.toThrow("No autorizado");
      await expect(getUsuarioDetalle(actor, "x")).rejects.toThrow("No autorizado");
    }
    expect(h.wheres).toHaveLength(0);
  });
});

describe("listUsuarios", () => {
  const fila = {
    id: "u1",
    nombres: "Ana",
    apellidos: "Quispe",
    email: "a@b.pe",
    rol: "admin",
    activo: true,
    createdAt: new Date(),
  };

  it("devuelve claves exactas, sin clerkId, documento ni teléfono, y marca esActual", async () => {
    h.queue.push([{ total: 1 }], [fila, { ...fila, id: "s1" }]);
    const r = await listUsuarios(superadmin, filtros);
    expect(Object.keys(r.items[0]).sort()).toEqual(
      ["activo", "apellidos", "createdAt", "email", "esActual", "id", "nombres", "rol"].sort(),
    );
    expect(r.items.map((i) => i.esActual)).toEqual([false, true]);
    expect(r).toMatchObject({ total: 1, pagina: 1, totalPaginas: 1 });
  });

  it("normaliza la página a la última cuando excede el total", async () => {
    h.queue.push([{ total: 25 }], []);
    const r = await listUsuarios(superadmin, { ...filtros, pagina: 99 });
    expect(r.pagina).toBe(3);
    expect(r.totalPaginas).toBe(3);
  });

  it("sin resultados deja 1 página", async () => {
    h.queue.push([{ total: 0 }], []);
    const r = await listUsuarios(superadmin, { ...filtros, pagina: 5 });
    expect(r).toMatchObject({ pagina: 1, totalPaginas: 1, items: [] });
  });

  it("combina q, rol y estado y trata % y _ como texto literal", async () => {
    h.queue.push([{ total: 0 }], []);
    await listUsuarios(superadmin, { q: "50%_x", rol: "admin", estado: "activo", pagina: 1 });
    const { sql, params } = dialect.sqlToQuery(h.wheres[0] as never);
    expect(sql).toContain("ilike");
    expect(sql).toContain(" and ");
    expect(params).toContain("%50\\%\\_x%");
    expect(params).toContain("admin");
    expect(params).toContain(true);
  });
});

describe("escapeLike", () => {
  it("escapa %, _ y \\", () => {
    expect(escapeLike("50%_x\\")).toBe("50\\%\\_x\\\\");
  });
});

describe("getUsuarioDetalle", () => {
  const base = {
    id: "u1",
    nombres: "Ana",
    apellidos: "Quispe",
    email: "a@b.pe",
    documento: "123",
    telefono: null,
    activo: true,
    createdAt: new Date(),
  };

  it("inexistente devuelve null", async () => {
    h.queue.push([]);
    expect(await getUsuarioDetalle(superadmin, "u1")).toBeNull();
  });

  it("cliente incluye conteos y auditoría con nombre del autor", async () => {
    h.queue.push(
      [{ ...base, rol: "cliente" }],
      [{ n: 4 }],
      [{ n: 2 }],
      [
        {
          id: "x",
          accion: "CAMBIO_ROL",
          valorAnterior: "cliente",
          valorNuevo: "admin",
          createdAt: new Date(),
          autorNombres: "Luis",
          autorApellidos: "Soto",
          autorEmail: "l@b.pe",
        },
      ],
    );
    const d = await getUsuarioDetalle(superadmin, "u1");
    expect(d).toMatchObject({ expedientesPresentados: 4, establecimientosRegistrados: 2, esActual: false });
    expect(d?.auditoria[0].actorNombre).toBe("Luis Soto");
    expect(d).not.toHaveProperty("clerkId");
  });

  it("no cliente no cuenta expedientes y marca esActual", async () => {
    h.queue.push([{ ...base, id: "s1", rol: "admin" }], []);
    const d = await getUsuarioDetalle(superadmin, "s1");
    expect(d).toMatchObject({
      expedientesPresentados: null,
      establecimientosRegistrados: null,
      esActual: true,
      auditoria: [],
    });
  });
});
