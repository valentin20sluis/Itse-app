import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ filas: [] as unknown[], campos: undefined as unknown, limite: 0 }));

vi.mock("@/db", () => {
  const q: Record<string, unknown> = {};
  for (const m of ["from", "innerJoin", "where", "orderBy"]) q[m] = () => q;
  q.limit = (n: number) => {
    h.limite = n;
    return Promise.resolve(h.filas);
  };
  return { db: { select: (campos: unknown) => ((h.campos = campos), q) } };
});

import { listExpedientesCsv } from "@/modules/reportes/services/reporte-csv.service";

const admin = { id: "u1", rol: "admin" as const };
const filtros = { desde: "2026-01-01", hasta: "2026-03-15" };
const fila = (i: number) => ({
  numero: `EXP-${i}`,
  presentadoAt: new Date("2026-02-01T03:00:00.000Z"),
  estado: "EN_REVISION",
  nivelRiesgo: null,
  tipoTramite: "RENOVACION",
  distrito: "Surco",
});

beforeEach(() => {
  h.filas = [];
});

describe("listExpedientesCsv", () => {
  it("rechaza al cliente", async () => {
    await expect(listExpedientesCsv({ id: "c", rol: "cliente" }, filtros)).rejects.toThrow("No autorizado");
  });

  it("devuelve solo las columnas permitidas, con etiquetas y fecha de Lima", async () => {
    h.filas = [fila(1)];
    const r = await listExpedientesCsv(admin, filtros);
    expect(r.truncado).toBe(false);
    expect(r.filas).toEqual([
      {
        numero: "EXP-1",
        fechaPresentacion: "31/01/2026",
        estado: "En revisión",
        nivelRiesgo: "Sin clasificar",
        tipoTramite: "Renovación",
        distrito: "Surco",
      },
    ]);
    expect(Object.keys(h.campos as object)).toEqual([
      "numero",
      "presentadoAt",
      "estado",
      "nivelRiesgo",
      "tipoTramite",
      "distrito",
    ]);
  });

  it("corta en 2000 filas e indica truncado", async () => {
    h.filas = Array.from({ length: 2001 }, (_, i) => fila(i));
    const r = await listExpedientesCsv(admin, filtros);
    expect(h.limite).toBe(2001);
    expect(r.filas).toHaveLength(2000);
    expect(r.truncado).toBe(true);
  });
});
