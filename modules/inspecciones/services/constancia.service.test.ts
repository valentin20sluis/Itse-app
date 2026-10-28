import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ lecturas: [] as unknown[] }));

function cadena() {
  const c: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "orderBy", "innerJoin"]) c[m] = () => c;
  c.then = (res: (v: unknown) => unknown) => res(h.lecturas.shift());
  return c;
}

vi.mock("@/db", () => ({ db: { select: () => cadena() } }));

import { getConstanciaData } from "@/modules/inspecciones/services/constancia.service";

const admin = { id: "u1", rol: "admin" as const };
const cliente = { id: "u3", rol: "cliente" as const };

const exp = (o: Record<string, unknown> = {}) => [
  {
    numero: "EXP-2026-00001",
    estado: "INSPECTOR_DESIGNADO",
    nivelRiesgo: "ALTO",
    nombreComercial: "Bodega Demo",
    direccion: "Av. Ficticia 123",
    distrito: "Distrito Demo",
    ...o,
  },
];
const insp = [
  { nombre: "Alva, Rosa", documento: "11111111", profesion: "ARQUITECTO", designadoAt: new Date("2026-03-02T15:00:00Z") },
  { nombre: "Zea, Luis", documento: "22222222", profesion: null, designadoAt: new Date("2026-03-01T15:00:00Z") },
];

beforeEach(() => {
  h.lecturas = [];
});

describe("getConstanciaData", () => {
  it("lanza para cliente", async () => {
    await expect(getConstanciaData(cliente, "e")).rejects.toThrow("No autorizado");
  });

  it.each([
    ["no existe", []],
    ["sin número", exp({ numero: null })],
    ["sin riesgo", exp({ nivelRiesgo: null })],
    ["anulado", exp({ estado: "ANULADO" })],
  ])("null: %s", async (_n, filas) => {
    h.lecturas = [filas];
    expect(await getConstanciaData(admin, "e")).toBeNull();
  });

  it("null sin designaciones", async () => {
    h.lecturas = [exp(), []];
    expect(await getConstanciaData(admin, "e")).toBeNull();
  });

  it("devuelve los datos completos sin teléfono ni correo", async () => {
    h.lecturas = [exp(), insp, [{ nombres: "Ana", apellidos: "Ruiz" }]];
    const d = await getConstanciaData(admin, "e");
    expect(d).toEqual({
      numero: "CD-2026-00001",
      expedienteNumero: "EXP-2026-00001",
      establecimiento: { nombreComercial: "Bodega Demo", direccion: "Av. Ficticia 123", distrito: "Distrito Demo" },
      nivelRiesgo: "ALTO",
      tipoItse: "PREVIA",
      inspectores: [
        { nombre: "Alva, Rosa", documento: "11111111", profesion: "Arquitecto" },
        { nombre: "Zea, Luis", documento: "22222222", profesion: null },
      ],
      fechaDesignacion: new Date("2026-03-01T15:00:00Z"),
      jefeNombre: "Ana Ruiz",
    });
    expect(JSON.stringify(d)).not.toMatch(/telefono|email/);
  });

  it("jefeNombre nulo sin fila de aprobación", async () => {
    h.lecturas = [exp(), insp, []];
    expect((await getConstanciaData(admin, "e"))?.jefeNombre).toBeNull();
  });
});
