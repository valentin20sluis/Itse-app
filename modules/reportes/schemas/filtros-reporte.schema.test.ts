import { describe, expect, it } from "vitest";
import { filtrosReporteSchema } from "@/modules/reportes/schemas/filtros-reporte.schema";
import { rangoDesdeHasta } from "@/modules/reportes/utils/rango-fechas";

const parse = (v: Record<string, unknown>) => filtrosReporteSchema.parse(v);

describe("filtrosReporteSchema", () => {
  it("sin parámetros usa el rango por defecto", () => {
    const r = rangoDesdeHasta();
    expect(parse({})).toEqual({ desde: r.desdeInput, hasta: r.hastaInput });
  });

  it("acepta filtros válidos", () => {
    expect(
      parse({ desde: "2026-01-01", hasta: "2026-02-01", estado: "CUMPLE", riesgo: "ALTO", distrito: " Miraflores " }),
    ).toEqual({ desde: "2026-01-01", hasta: "2026-02-01", estado: "CUMPLE", riesgo: "ALTO", distrito: "Miraflores" });
  });

  it("ignora estado BORRADOR o desconocido, riesgo desconocido y arreglos", () => {
    const r = parse({ estado: "BORRADOR", riesgo: "X", distrito: ["a", "b"], desde: ["2026-01-01", "2026-01-02"] });
    expect(r.estado).toBeUndefined();
    expect(r.riesgo).toBeUndefined();
    expect(r.distrito).toBeUndefined();
    expect(parse({ estado: "NOPE" }).estado).toBeUndefined();
    expect(r.desde).toBe(rangoDesdeHasta().desdeInput);
  });

  it("ignora fechas inválidas", () => {
    const d = rangoDesdeHasta();
    expect(parse({ desde: "ayer", hasta: "2026-13-40" })).toMatchObject({ desde: d.desdeInput, hasta: d.hastaInput });
  });

  it("limita el distrito a 60 caracteres y vacío equivale a sin filtro", () => {
    expect(parse({ distrito: "x".repeat(100) }).distrito).toHaveLength(60);
    expect(parse({ distrito: "   " }).distrito).toBeUndefined();
  });

  it("recorta el rango a 366 días", () => {
    const r = parse({ desde: "2020-01-01" });
    const dias = (Date.parse(r.hasta) - Date.parse(r.desde)) / 86_400_000 + 1;
    expect(dias).toBeLessThanOrEqual(366);
  });
});
