import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  respuestas: [] as unknown[][],
  wheres: [] as unknown[],
  campos: [] as unknown[],
  tablas: [] as unknown[],
}));

vi.mock("@/db", () => ({
  db: {
    select: (campos: unknown) => {
      h.campos.push(campos);
      const filas = h.respuestas[h.campos.length - 1] ?? [];
      const c: Record<string, unknown> = {};
      c.from = (t: unknown) => {
        h.tablas.push(t);
        return c;
      };
      c.where = (w: unknown) => {
        h.wheres.push(w);
        return c;
      };
      c.groupBy = () => c;
      c.then = (res: (v: unknown) => unknown) => res(filas);
      return c;
    },
  },
}));

const certificadosMock = vi.hoisted(() => vi.fn());
vi.mock("@/modules/reportes/services/certificados-vencimiento.service", () => ({
  contarCertificadosPorVencimiento: certificadosMock,
}));

import type { SQL } from "drizzle-orm";
import { getDashboardPanel } from "@/modules/reportes/services/dashboard.service";
import { aInputLima, parseFechaLima } from "@/modules/inspecciones/utils/fecha-diligencia";

const dialect = new PgDialect();
const consulta = (s: unknown) => dialect.sqlToQuery(s as SQL);

const admin = { id: "u1", rol: "admin" as const };
// 23:30 de Lima del 31-ene-2027 (04:30 UTC del 1-feb).
const AHORA = new Date("2027-02-01T04:30:00.000Z");
const HOY = parseFechaLima(aInputLima(AHORA)) as Date;
const enDias = (n: number) => new Date(HOY.getTime() + n * 86_400_000).toISOString();

beforeEach(() => {
  h.respuestas = [];
  h.wheres = [];
  h.campos = [];
  h.tablas = [];
  certificadosMock.mockReset();
  certificadosMock.mockResolvedValue({ vencidos: 0, hasta30: 2, de31a60: 3, vigentes: 9 });
});

describe("getDashboardPanel", () => {
  it("rechaza al cliente", async () => {
    await expect(getDashboardPanel({ id: "u3", rol: "cliente" }, AHORA)).rejects.toThrow("No autorizado");
  });

  it("mapea los indicadores y suma los certificados por vencer", async () => {
    h.respuestas = [
      [],
      [{ porRevisar: 1, enRevision: 2, pendientesJefatura: 3, inspeccionesSemana: 4, subsanacionPorVencer: 5, nombre: "SECRETO" }],
      [],
    ];
    const r = await getDashboardPanel(admin, AHORA);
    expect(r.indicadores).toEqual({
      porRevisar: 1,
      enRevision: 2,
      pendientesJefatura: 3,
      inspeccionesSemana: 4,
      subsanacionPorVencer: 5,
      certificadosPorVencer: 5,
    });
    expect(r.certificados).toEqual({ vencidos: 0, hasta30: 2, de31a60: 3, vigentes: 9 });
  });

  it("sin filas devuelve ceros", async () => {
    const r = await getDashboardPanel(admin, AHORA);
    expect(Object.values(r.indicadores).slice(0, 5)).toEqual([0, 0, 0, 0, 0]);
    expect(r.porEstado).toEqual([]);
  });

  it("porEstado sigue ESTADOS_ORDEN, sin BORRADOR ni ceros", async () => {
    h.respuestas = [
      [
        { estado: "FINALIZADO", cantidad: 4 },
        { estado: "BORRADOR", cantidad: 9 },
        { estado: "PRESENTADO", cantidad: 2 },
        { estado: "EN_REVISION", cantidad: 0 },
      ],
    ];
    const r = await getDashboardPanel(admin, AHORA);
    expect(r.porEstado).toEqual([
      { estado: "PRESENTADO", cantidad: 2 },
      { estado: "FINALIZADO", cantidad: 4 },
    ]);
  });

  it("porMes tiene 6 meses de Lima con ceros rellenados", async () => {
    h.respuestas = [[], [], [{ clave: "2027-01", cantidad: 3 }, { clave: "2026-10", cantidad: 1 }]];
    const r = await getDashboardPanel(admin, AHORA);
    expect(r.porMes).toEqual([
      { clave: "2026-08", cantidad: 0 },
      { clave: "2026-09", cantidad: 0 },
      { clave: "2026-10", cantidad: 1 },
      { clave: "2026-11", cantidad: 0 },
      { clave: "2026-12", cantidad: 0 },
      { clave: "2027-01", cantidad: 3 },
    ]);
  });

  it("agrupa los meses en hora de Lima y calcula limites desde hoy en Lima", async () => {
    await getDashboardPanel(admin, AHORA);
    expect(consulta(h.campos[2] && (h.campos[2] as Record<string, unknown>).clave).sql).toContain("America/Lima");

    const conteos = Object.values(h.campos[1] as Record<string, unknown>).flatMap((c) =>
      consulta(c).params.map((p) => (p instanceof Date ? p.toISOString() : String(p))),
    );
    expect(conteos).toEqual(expect.arrayContaining([HOY.toISOString(), enDias(7), enDias(4)]));
    expect(HOY.toISOString()).toBe("2027-01-31T05:00:00.000Z");
  });

  it("hace a lo sumo 3 consultas propias y todas solo de presentados", async () => {
    await getDashboardPanel(admin, AHORA);
    expect(h.campos).toHaveLength(3);
    for (const w of h.wheres) expect(consulta(w).sql).toContain('"numero" is not null');
  });

  it("no consulta usuarios ni inspectores", async () => {
    await getDashboardPanel(admin, AHORA);
    const nombres = h.tablas.map((t) => String((t as { [k: symbol]: unknown })[Symbol.for("drizzle:Name")]));
    expect(nombres).toEqual(["expedientes", "expedientes", "expedientes"]);
  });
});
