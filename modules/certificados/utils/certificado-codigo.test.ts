import { describe, expect, it } from "vitest";
import { ALFABETO_CODIGO, formatCodigo, generarCodigo, normalizarCodigo } from "./certificado-codigo";

describe("generarCodigo", () => {
  it("12 caracteres del alfabeto y 1000 códigos distintos", () => {
    const codigos = new Set(Array.from({ length: 1000 }, generarCodigo));
    expect(codigos.size).toBe(1000);
    for (const c of codigos) {
      expect(c).toHaveLength(12);
      expect([...c].every((x) => ALFABETO_CODIGO.includes(x))).toBe(true);
    }
  });
});

describe("normalizarCodigo", () => {
  it("quita espacios y guiones, pasa a mayúsculas", () => {
    expect(normalizarCodigo(" abcd-efgh jkmn ")).toBe("ABCDEFGHJKMN");
  });
  it("mapea O->0, I->1, L->1", () => {
    expect(normalizarCodigo("OIL0-1111-2222")).toBe("011011112222");
  });
  it.each(["", "ABCD", "ABCDEFGHJKMNP", "ABCDEFGHJKMU", "ABCDEFGHJKM_"])("rechaza %j", (v) => {
    expect(normalizarCodigo(v)).toBeNull();
  });
});

describe("formatCodigo", () => {
  it("agrupa de a cuatro", () => {
    expect(formatCodigo("ABCDEFGHJKMN")).toBe("ABCD-EFGH-JKMN");
  });
});
