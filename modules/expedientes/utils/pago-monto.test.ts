import { describe, expect, it } from "vitest";
import { validarMontoPago } from "./pago-monto";

const base = {
  amountTotal: 30000,
  tasaMonto: 30000,
  tipoSesion: "PREVIA",
  tipoActual: "PREVIA",
  montoActual: 30000,
};

describe("validarMontoPago", () => {
  it.each([
    ["monto guardado igual y mismo tipo", {}, true],
    ["la tasa cambió tras abrir la sesión", { montoActual: 35000 }, true],
    ["cambió el tipo de ITSE", { tipoActual: "POSTERIOR", montoActual: 15000 }, false],
    ["monto menor al guardado", { amountTotal: 15000 }, false],
    ["monto mayor al guardado", { amountTotal: 35000 }, false],
    ["sesión antigua sin metadata y monto actual", { tipoSesion: undefined, tasaMonto: null }, true],
    ["sesión antigua sin metadata y otro monto", { tipoSesion: undefined, tasaMonto: null, amountTotal: 15000 }, false],
    ["monto total nulo", { amountTotal: null }, false],
  ] as const)("%s", (_n, extra, esperado) => {
    expect(validarMontoPago({ ...base, ...extra })).toBe(esperado);
  });
});
