import { describe, expect, it } from "vitest";

import { PAGE_SIZE, filtrosBandejaSchema } from "./filtros-bandeja.schema";

describe("filtrosBandejaSchema", () => {
  it("usa valores por defecto sin parámetros", () => {
    expect(filtrosBandejaSchema.parse({})).toEqual({ page: 1 });
    expect(PAGE_SIZE).toBe(20);
  });

  it("acepta valores válidos", () => {
    expect(filtrosBandejaSchema.parse({ estado: "EN_REVISION", q: "EXP-2026", page: "3" })).toEqual({
      estado: "EN_REVISION",
      q: "EXP-2026",
      page: 3,
    });
  });

  it.each([
    [{ estado: "NOPE" }],
    [{ estado: "BORRADOR" }],
    [{ estado: ["PRESENTADO", "ANULADO"] }],
  ])("ignora estado inválido %j", (input) => {
    expect(filtrosBandejaSchema.parse(input).estado).toBeUndefined();
  });

  it.each([["0"], ["abc"], ["-1"], ["1.5"], [["1", "2"]], [undefined]])(
    "page inválida %j vuelve a 1",
    (page) => {
      expect(filtrosBandejaSchema.parse({ page }).page).toBe(1);
    },
  );

  it("acepta pendientes=jefatura y descarta cualquier otro valor", () => {
    expect(filtrosBandejaSchema.parse({ pendientes: "jefatura" }).pendientes).toBe("jefatura");
    for (const pendientes of ["", "x", ["jefatura", "x"], undefined]) {
      expect(filtrosBandejaSchema.parse({ pendientes }).pendientes).toBeUndefined();
    }
    expect(filtrosBandejaSchema.parse({ pendientes: "jefatura", estado: "EN_REVISION", q: "a" })).toEqual({
      pendientes: "jefatura",
      estado: "EN_REVISION",
      q: "a",
      page: 1,
    });
  });

  it("recorta q y descarta si queda vacío", () => {
    expect(filtrosBandejaSchema.parse({ q: "  abc  " }).q).toBe("abc");
    expect(filtrosBandejaSchema.parse({ q: "x".repeat(50) }).q).toHaveLength(30);
    expect(filtrosBandejaSchema.parse({ q: "   " }).q).toBeUndefined();
    expect(filtrosBandejaSchema.parse({ q: ["a", "b"] }).q).toBeUndefined();
  });
});
