import { describe, expect, it } from "vitest";
import { montoTasa } from "./tasa";

const tasas = { POSTERIOR: 16000, PREVIA: 31000 };

describe("montoTasa", () => {
  it.each([
    ["BAJO", 16000],
    ["MEDIO", 16000],
    ["ALTO", 31000],
    ["MUY_ALTO", 31000],
  ] as const)("%s cuesta %i céntimos", (nivel, monto) => {
    expect(montoTasa(nivel, tasas)).toBe(monto);
  });
});
