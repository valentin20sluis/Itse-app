import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  filas: [] as unknown[],
  limit: vi.fn(),
  values: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/db", () => {
  const c: Record<string, unknown> = {};
  for (const m of ["from", "innerJoin", "where", "orderBy"]) c[m] = () => c;
  c.limit = (n: number) => {
    h.limit(n);
    return Promise.resolve(h.filas);
  };
  return {
    db: {
      select: (...a: unknown[]) => {
        h.select(...a);
        return c;
      },
      insert: () => ({ values: (v: unknown) => ({ kind: "insert", v }) }),
    },
  };
});

import {
  auditoriaFila,
  listAuditoria,
} from "@/modules/configuracion/services/auditoria-configuracion.service";

const superadmin = { id: "s1", rol: "superadmin" as const };
const fecha = new Date("2026-10-28T15:00:00Z");

beforeEach(() => {
  h.filas = [];
  h.limit.mockClear();
  h.select.mockClear();
});

describe("listAuditoria", () => {
  it.each(["admin", "cliente"] as const)("rechaza al rol %s sin tocar la BD", async (rol) => {
    await expect(listAuditoria({ id: "x", rol }, "FERIADO")).rejects.toThrow("No autorizado");
    expect(h.select).not.toHaveBeenCalled();
  });

  it("usa 20 por defecto, respeta el límite y arma el nombre completo", async () => {
    h.filas = [
      { id: "1", accion: "CREAR", referencia: "2026-12-25", valorAnterior: null, valorNuevo: "Navidad", createdAt: fecha, autorNombres: "Ana", autorApellidos: "Soto", autorEmail: "a@x.pe" },
      { id: "2", accion: "ELIMINAR", referencia: "2026-12-25", valorAnterior: "Navidad", valorNuevo: null, createdAt: fecha, autorNombres: "", autorApellidos: "", autorEmail: "b@x.pe" },
    ];
    const r = await listAuditoria(superadmin, "FERIADO");
    expect(h.limit).toHaveBeenCalledWith(20);
    expect(r.map((x) => x.actorNombre)).toEqual(["Ana Soto", "b@x.pe"]);
    expect(r[0]).not.toHaveProperty("autorEmail");
    await listAuditoria(superadmin, "FERIADO", 5);
    expect(h.limit).toHaveBeenLastCalledWith(5);
  });
});

describe("auditoriaFila", () => {
  it("arma los campos de la fila", () => {
    const fila = {
      actorId: "s1",
      entidad: "FERIADO" as const,
      accion: "CREAR" as const,
      referencia: "2026-12-25",
      valorAnterior: null,
      valorNuevo: "Navidad",
    };
    expect(auditoriaFila(fila)).toEqual({ kind: "insert", v: fila });
  });
});
