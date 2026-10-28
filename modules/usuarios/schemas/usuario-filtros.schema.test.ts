import { describe, expect, it } from "vitest";
import { parseUsuarioFiltros } from "./usuario-filtros.schema";

describe("parseUsuarioFiltros", () => {
  it("sin parámetros usa valores por defecto", () => {
    expect(parseUsuarioFiltros({})).toEqual({ q: "", rol: undefined, estado: undefined, pagina: 1 });
  });

  it("acepta valores válidos y recorta q", () => {
    expect(parseUsuarioFiltros({ q: "  ana ", rol: "admin", estado: "inactivo", pagina: "3" })).toEqual({
      q: "ana",
      rol: "admin",
      estado: "inactivo",
      pagina: 3,
    });
  });

  it("pagina 0, negativa, decimal o texto vuelve a 1", () => {
    for (const p of ["0", "-2", "1.5", "abc", ""]) {
      expect(parseUsuarioFiltros({ pagina: p }).pagina).toBe(1);
    }
  });

  it("rol y estado inválidos se ignoran", () => {
    const r = parseUsuarioFiltros({ rol: "otro", estado: "x" });
    expect(r.rol).toBeUndefined();
    expect(r.estado).toBeUndefined();
  });

  it("q larga se recorta a 100 caracteres", () => {
    expect(parseUsuarioFiltros({ q: "a".repeat(300) }).q).toHaveLength(100);
  });

  it("toma el primer valor si viene repetido", () => {
    expect(parseUsuarioFiltros({ rol: ["cliente", "admin"] }).rol).toBe("cliente");
  });
});
