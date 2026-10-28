import { describe, expect, it } from "vitest";
import { esNumeroResolucion, formatNumeroResolucion } from "./resolucion-numero";

describe("formatNumeroResolucion", () => {
  it("rellena a 4 dígitos y no recorta números largos", () => {
    expect(formatNumeroResolucion(2026, 1)).toBe("RG-2026-0001");
    expect(formatNumeroResolucion(2026, 12345)).toBe("RG-2026-12345");
  });
});

describe("esNumeroResolucion", () => {
  it.each(["RG-2026-0001", "RG-2026-12345"])("acepta %s", (v) => {
    expect(esNumeroResolucion(v)).toBe(true);
  });
  it.each(["", "0001-2026", "RG-26-1", "CD-2026-00001"])("rechaza %j", (v) => {
    expect(esNumeroResolucion(v)).toBe(false);
  });
});
