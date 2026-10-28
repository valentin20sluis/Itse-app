import { describe, expect, it } from "vitest";
import { esNumeroCertificado, formatNumeroCertificado } from "./certificado-numero";

describe("formatNumeroCertificado", () => {
  it("rellena a 4 dígitos y no recorta números largos", () => {
    expect(formatNumeroCertificado(2026, 1)).toBe("0001-2026");
    expect(formatNumeroCertificado(2026, 12345)).toBe("12345-2026");
  });
});

describe("esNumeroCertificado", () => {
  it.each(["0001-2026", "12345-2026"])("acepta %s", (v) => {
    expect(esNumeroCertificado(v)).toBe(true);
  });
  it.each(["", "1-2026", "0001-26", "EXP-2026-00001"])("rechaza %j", (v) => {
    expect(esNumeroCertificado(v)).toBe(false);
  });
});
