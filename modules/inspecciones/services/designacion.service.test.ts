import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const h = vi.hoisted(() => ({
  lecturas: [] as unknown[],
  actualizados: [{ id: "x" }] as unknown[],
  batch: vi.fn(),
}));

function cadena() {
  const c: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "orderBy", "innerJoin"]) c[m] = () => c;
  c.then = (res: (v: unknown) => unknown) => res(h.lecturas.shift());
  return c;
}

vi.mock("@/db", () => ({
  db: {
    select: () => cadena(),
    update: () => ({ set: () => ({ where: () => ({ returning: () => ({ kind: "update" }) }) }) }),
    insert: () => ({ select: (q: unknown) => ({ kind: "insert", q }) }),
    batch: h.batch,
  },
}));

import {
  designarInspectores,
  getResumenInspeccion,
  listInspectoresElegibles,
} from "@/modules/inspecciones/services/designacion.service";

const admin = { id: "u1", rol: "admin" as const };
const cliente = { id: "u3", rol: "cliente" as const };
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

const exp = (estado: string, nivelRiesgo: string | null, numero: string | null = "EXP-1") => [
  { estado, nivelRiesgo, numero },
];

beforeEach(() => {
  h.lecturas = [];
  h.actualizados = [{ id: "x" }];
  h.batch.mockReset();
  h.batch.mockImplementation(async () => [h.actualizados]);
});

describe("designarInspectores", () => {
  it("lanza para cliente", async () => {
    await expect(designarInspectores(cliente, "e", [A])).rejects.toThrow("No autorizado");
  });

  it("no_encontrado: inexistente o sin número", async () => {
    h.lecturas = [[]];
    expect(await designarInspectores(admin, "e", [A])).toEqual({ status: "no_encontrado" });
    h.lecturas = [exp("APROBADO_JEFATURA", "BAJO", null)];
    expect(await designarInspectores(admin, "e", [A])).toEqual({ status: "no_encontrado" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("no_permitido: otro estado o riesgo nulo", async () => {
    h.lecturas = [exp("ENVIADO_JEFATURA", "BAJO")];
    expect(await designarInspectores(admin, "e", [A])).toEqual({ status: "no_permitido" });
    h.lecturas = [exp("APROBADO_JEFATURA", null)];
    expect(await designarInspectores(admin, "e", [A])).toEqual({ status: "no_permitido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("cantidad_invalida: distinta de la requerida o repetidos", async () => {
    h.lecturas = [exp("APROBADO_JEFATURA", "ALTO")];
    expect(await designarInspectores(admin, "e", [A])).toEqual({ status: "cantidad_invalida" });
    h.lecturas = [exp("APROBADO_JEFATURA", "ALTO")];
    expect(await designarInspectores(admin, "e", [A, A])).toEqual({ status: "cantidad_invalida" });
    h.lecturas = [exp("APROBADO_JEFATURA", "BAJO")];
    expect(await designarInspectores(admin, "e", [A, B])).toEqual({ status: "cantidad_invalida" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("inspector_invalido: alguno inexistente o inactivo", async () => {
    h.lecturas = [exp("APROBADO_JEFATURA", "ALTO"), [{ id: A }]];
    expect(await designarInspectores(admin, "e", [A, B])).toEqual({ status: "inspector_invalido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("ok: un solo batch con UPDATE, historial sin nombres y una fila por inspector", async () => {
    h.lecturas = [exp("APROBADO_JEFATURA", "MUY_ALTO"), [{ id: A }, { id: B }, { id: C }]];
    expect(await designarInspectores(admin, "e", [A, B, C])).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(1);
    const [sentencias] = h.batch.mock.calls[0];
    expect(sentencias.map((s: { kind: string }) => s.kind)).toEqual([
      "update",
      "insert",
      "insert",
      "insert",
      "insert",
    ]);
    const historial = new PgDialect().sqlToQuery(sentencias[1].q);
    expect(historial.params).toEqual(
      expect.arrayContaining(["APROBADO_JEFATURA", "INSPECTOR_DESIGNADO", "u1", "Inspectores designados: 3."]),
    );
    const designacion = new PgDialect().sqlToQuery(sentencias[3].q);
    expect(designacion.params).toContain(B);
  });

  it("conflicto: el UPDATE afecta 0 filas", async () => {
    h.lecturas = [exp("APROBADO_JEFATURA", "BAJO"), [{ id: A }]];
    h.actualizados = [];
    expect(await designarInspectores(admin, "e", [A])).toEqual({ status: "conflicto" });
    expect(h.batch).toHaveBeenCalledTimes(1);
  });
});

describe("listInspectoresElegibles", () => {
  it("lanza para cliente y devuelve los activos al personal", async () => {
    await expect(listInspectoresElegibles(cliente)).rejects.toThrow("No autorizado");
    const filas = [{ id: A, nombre: "Pérez, Ana", documento: "1" }];
    h.lecturas = [filas];
    expect(await listInspectoresElegibles(admin)).toEqual(filas);
  });
});

describe("getResumenInspeccion", () => {
  it("personal: incluye inspectores", async () => {
    const filas = [{ nombre: "Pérez, Ana", documento: "1", telefono: "9" }];
    h.lecturas = [filas];
    expect(await getResumenInspeccion(admin, "e")).toEqual({ total: 1, inspectores: filas });
  });

  it("cliente dueño: solo total, sin propiedad inspectores", async () => {
    h.lecturas = [[{ id: "e" }], [{ total: 2 }]];
    const r = await getResumenInspeccion(cliente, "e");
    expect(r).toEqual({ total: 2 });
    expect("inspectores" in r).toBe(false);
  });

  it("cliente ajeno: total 0", async () => {
    h.lecturas = [[]];
    expect(await getResumenInspeccion(cliente, "e")).toEqual({ total: 0 });
  });
});
