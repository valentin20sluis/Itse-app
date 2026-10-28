import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  orderBy: vi.fn(),
  returning: vi.fn(),
  set: vi.fn(),
  values: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  asc: (c: { name: string }) => `asc:${c.name}`,
  desc: (c: { name: string }) => `desc:${c.name}`,
  eq: () => "eq",
}));

vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: () => ({ orderBy: m.orderBy }) }),
    insert: () => ({
      values: (v: unknown) => {
        m.values(v);
        return { returning: m.returning };
      },
    }),
    update: () => ({
      set: (s: unknown) => {
        m.set(s);
        return { where: () => ({ returning: m.returning }) };
      },
    }),
  },
}));

import {
  createInspector,
  InspectorDuplicadoError,
  listInspectores,
  setInspectorActivo,
  updateInspector,
} from "./inspector.service";

const cliente = { id: "u1", rol: "cliente" as const };
const admin = { id: "u2", rol: "admin" as const };
const input = {
  nombres: "Ana",
  apellidos: "Quispe",
  documento: "12345678",
  telefono: "987654321",
  email: "ana@example.com",
  habilitadoPrevia: false,
};
const ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";

beforeEach(() => vi.resetAllMocks());

describe("inspector.service", () => {
  it("rechaza al cliente en las 4 funciones sin tocar la BD", async () => {
    await expect(listInspectores(cliente)).rejects.toThrow("No autorizado");
    await expect(createInspector(cliente, input)).rejects.toThrow("No autorizado");
    await expect(updateInspector(cliente, ID, input)).rejects.toThrow("No autorizado");
    await expect(setInspectorActivo(cliente, ID, false)).rejects.toThrow("No autorizado");
    expect(m.orderBy).not.toHaveBeenCalled();
    expect(m.returning).not.toHaveBeenCalled();
  });

  it("lista activos primero y luego por apellidos en una consulta", async () => {
    m.orderBy.mockResolvedValue([{ id: "a" }]);
    expect(await listInspectores(admin)).toEqual([{ id: "a" }]);
    expect(m.orderBy).toHaveBeenCalledTimes(1);
    expect(m.orderBy.mock.calls[0].slice(0, 2)).toEqual(["desc:activo", "asc:apellidos"]);
  });

  it("crea el inspector", async () => {
    m.returning.mockResolvedValue([{ id: "n" }]);
    expect(await createInspector(admin, input)).toEqual({ id: "n" });
    expect(m.values).toHaveBeenCalledWith(input);
  });

  it("update devuelve null si no existe y actualiza updatedAt", async () => {
    m.returning.mockResolvedValue([]);
    expect(await updateInspector(admin, ID, input)).toBeNull();
    expect(m.set.mock.calls[0][0].updatedAt).toBeInstanceOf(Date);
  });

  it("setInspectorActivo devuelve null si no existe y la fila si existe", async () => {
    m.returning.mockResolvedValueOnce([]);
    expect(await setInspectorActivo(admin, ID, false)).toBeNull();
    m.returning.mockResolvedValueOnce([{ id: ID, activo: false }]);
    expect(await setInspectorActivo(admin, ID, false)).toEqual({ id: ID, activo: false });
    expect(m.set).toHaveBeenLastCalledWith(expect.objectContaining({ activo: false }));
  });

  it("documento repetido lanza InspectorDuplicadoError (directo y en cause)", async () => {
    m.returning.mockRejectedValueOnce({ code: "23505" });
    await expect(createInspector(admin, input)).rejects.toBeInstanceOf(InspectorDuplicadoError);
    m.returning.mockRejectedValueOnce(new Error("x", { cause: { code: "23505" } }));
    await expect(updateInspector(admin, ID, input)).rejects.toBeInstanceOf(InspectorDuplicadoError);
  });

  it("otros errores se propagan", async () => {
    m.returning.mockRejectedValueOnce(new Error("boom"));
    await expect(createInspector(admin, input)).rejects.toThrow("boom");
  });
});
