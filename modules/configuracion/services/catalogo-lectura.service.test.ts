import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  where: vi.fn(),
  orderBy: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: (...a: unknown[]) => {
      m.select(...a);
      const ordenado = (...o: unknown[]) => {
        m.orderBy(...o);
        return Promise.resolve(m.rows);
      };
      return {
        from: () => ({
          orderBy: ordenado,
          where: (...w: unknown[]) => {
            m.where(...w);
            return { orderBy: ordenado };
          },
        }),
      };
    },
  },
}));

import { getCatalogoActivo, listCatalogoCompleto } from "./catalogo-lectura.service";

beforeEach(() => {
  m.select.mockClear();
  m.where.mockClear();
  m.orderBy.mockClear();
});

describe("getCatalogoActivo", () => {
  it("devuelve lo que entrega una sola consulta filtrada y ordenada", async () => {
    m.rows = [
      { codigo: "A", descripcion: "Alfa" },
      { codigo: "B", descripcion: "Beta" },
    ];
    expect(await getCatalogoActivo()).toEqual(m.rows);
    expect(m.select).toHaveBeenCalledTimes(1);
    expect(m.where).toHaveBeenCalledTimes(1);
    expect(m.orderBy).toHaveBeenCalledTimes(1);
  });

  it("catálogo vacío devuelve []", async () => {
    m.rows = [];
    expect(await getCatalogoActivo()).toEqual([]);
  });
});

describe("listCatalogoCompleto", () => {
  it.each(["admin", "cliente"] as const)("%s lanza sin tocar la BD", async (rol) => {
    await expect(listCatalogoCompleto({ id: "x", rol })).rejects.toThrow("No autorizado");
    expect(m.select).not.toHaveBeenCalled();
  });

  it("superadmin recibe activas y desactivadas sin filtrar", async () => {
    m.rows = [
      { id: "1", descripcion: "Alfa", activo: true },
      { id: "2", descripcion: "Beta", activo: false },
    ];
    expect(await listCatalogoCompleto({ id: "s1", rol: "superadmin" })).toEqual(m.rows);
    expect(m.where).not.toHaveBeenCalled();
    expect(m.orderBy).toHaveBeenCalledTimes(1);
  });
});
