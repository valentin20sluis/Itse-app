import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  consultas: [] as { sql: string; params: unknown[] }[],
  responder: (() => []) as (sql: string) => unknown[][],
}));

// Drizzle real sobre un cliente falso: se verifica el SQL generado y se simulan las filas (modo arreglo).
vi.mock("@neondatabase/serverless", () => ({
  neon: () => (sql: string, params: unknown[]) => {
    h.consultas.push({ sql, params });
    const rows = h.responder(sql);
    return Promise.resolve({ rows, fields: [], rowCount: rows.length });
  },
}));

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgres://u:p@localhost/db";
});

vi.mock("@/modules/reportes/services/certificados-vencimiento.service", () => ({
  contarCertificadosPorVencimiento: vi.fn(async () => ({ vencidos: 1, hasta30: 2, de31a60: 3, vigentes: 4 })),
}));

import { contarCertificadosPorVencimiento } from "@/modules/reportes/services/certificados-vencimiento.service";
import { getReporte } from "@/modules/reportes/services/reportes.service";
import type { FiltrosReporte } from "@/modules/reportes/schemas/filtros-reporte.schema";

const admin = { id: "u1", rol: "admin" as const };
const AHORA = new Date("2026-03-15T15:00:00.000Z");
const filtros: FiltrosReporte = { desde: "2026-01-01", hasta: "2026-03-15" };

const buscar = (parte: string) => h.consultas.find((c) => c.sql.includes(parte));

function responder(filas: Record<string, unknown[][]>) {
  h.responder = (sql) => {
    if (sql.includes("lead(")) return filas.tiempos ?? [];
    if (sql.includes("to_char(")) return filas.produccion ?? [];
    if (sql.includes('count(distinct "historial_estados"."expediente_id")')) return filas.resultados ?? [[0, 0, 0]];
    if (sql.includes("avg(extract(epoch from")) return filas.entrega ?? [[null]];
    if (sql.includes('from "certificados"')) return filas.emitidos ?? [[0]];
    if (sql.includes('select distinct "distrito"')) return filas.distritos ?? [];
    if (sql.includes('group by "expedientes"."nivel_riesgo"')) return filas.riesgo ?? [];
    if (sql.includes('group by "expedientes"."tipo_tramite"')) return filas.tramite ?? [];
    return [];
  };
}

beforeEach(() => {
  h.consultas = [];
  responder({});
});

describe("getReporte", () => {
  it("rechaza al cliente sin consultar", async () => {
    await expect(getReporte({ id: "c1", rol: "cliente" }, filtros, AHORA)).rejects.toThrow("No autorizado");
    expect(h.consultas).toHaveLength(0);
  });

  it("rellena los meses con ceros y agrupa por mes de Lima", async () => {
    responder({ produccion: [["2026-01", 3], ["2026-03", 2]] });
    const r = await getReporte(admin, filtros, AHORA);
    expect(r.produccion).toEqual([
      { clave: "2026-01", cantidad: 3 },
      { clave: "2026-02", cantidad: 0 },
      { clave: "2026-03", cantidad: 2 },
    ]);
    expect(buscar("to_char(")?.sql).toContain("at time zone 'America/Lima'");
  });

  it("incluye Sin clasificar solo si hay expedientes sin nivel", async () => {
    responder({ riesgo: [["ALTO", 2]], tramite: [["NUEVA", 2]] });
    let r = await getReporte(admin, filtros, AHORA);
    expect(r.porRiesgo).toEqual([
      { riesgo: "BAJO", cantidad: 0 },
      { riesgo: "MEDIO", cantidad: 0 },
      { riesgo: "ALTO", cantidad: 2 },
      { riesgo: "MUY_ALTO", cantidad: 0 },
    ]);
    expect(r.porTramite).toEqual([
      { tramite: "NUEVA", cantidad: 2 },
      { tramite: "RENOVACION", cantidad: 0 },
    ]);
    responder({ riesgo: [["ALTO", 2], [null, 1]] });
    r = await getReporte(admin, filtros, AHORA);
    expect(r.porRiesgo.at(-1)).toEqual({ riesgo: null, cantidad: 1 });
  });

  it("devuelve resultados distintos y tiempos ordenados con un decimal", async () => {
    responder({
      resultados: [[4, 1, 2]],
      tiempos: [["ENTREGADO", 3, 1], ["EN_REVISION", 3.04, 2], ["PRESENTADO", 0.26, 5]],
      entrega: [[12.345]],
    });
    const r = await getReporte(admin, filtros, AHORA);
    expect(r.resultados).toEqual({ cumple: 4, noCumple: 1, subsanacion: 2 });
    expect(r.tiempos).toEqual([
      { estado: "PRESENTADO", promedioDias: 0.3, cantidad: 5 },
      { estado: "EN_REVISION", promedioDias: 3, cantidad: 2 },
      { estado: "ENTREGADO", promedioDias: 3, cantidad: 1 },
    ]);
    expect(r.tiempoEntrega).toBe(12.3);
  });

  it("calcula el tiempo de cada paso con lead() por expediente y descarta los pasos sin siguiente", async () => {
    await getReporte(admin, filtros, AHORA);
    const { sql } = buscar("lead(") ?? { sql: "" };
    expect(sql).toContain('lead("historial_estados"."created_at") over (partition by "historial_estados"."expediente_id" order by "historial_estados"."created_at", "historial_estados"."id")');
    expect(sql).toContain('"pasos" where "fin" is not null group by "pasos"."estado_nuevo"');
  });

  it("tiempoEntrega es null sin entregas y solo mide el cambio a ENTREGADO", async () => {
    const r = await getReporte(admin, filtros, AHORA);
    expect(r.tiempoEntrega).toBeNull();
    const entrega = h.consultas.find((c) => c.sql.includes("avg(extract(epoch from") && !c.sql.includes("lead("));
    expect(entrega?.params).toContain("ENTREGADO");
  });

  it("emitidos ignora el filtro de estado y aplica riesgo y distrito; el vencimiento también", async () => {
    responder({ emitidos: [[7]] });
    const r = await getReporte(admin, { ...filtros, estado: "CUMPLE", riesgo: "ALTO", distrito: "Surco" }, AHORA);
    const c = buscar('from "certificados"');
    expect(c?.params).toEqual(expect.arrayContaining(["ALTO", "Surco"]));
    expect(c?.params).not.toContain("CUMPLE");
    expect(c?.sql).not.toContain('"expedientes"."estado"');
    expect(r.certificados.emitidos).toBe(7);
    expect(contarCertificadosPorVencimiento).toHaveBeenCalledWith(admin, { riesgo: "ALTO", distrito: "Surco" }, AHORA);
  });

  it("limita los distritos a 50", async () => {
    responder({ distritos: [["Barranco"], ["Surco"]] });
    const r = await getReporte(admin, filtros, AHORA);
    expect(r.distritos).toEqual(["Barranco", "Surco"]);
    expect(buscar('select distinct "distrito"')?.params).toContain(50);
  });

  it("no consulta usuarios ni inspectores ni columnas de personas", async () => {
    await getReporte(admin, filtros, AHORA);
    const todo = h.consultas.map((c) => c.sql).join("\n");
    expect(todo).not.toMatch(/usuarios|inspectores|solicitante_|nombre_comercial|email|telefono|documento/);
  });
});
