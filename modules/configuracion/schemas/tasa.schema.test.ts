import { describe, expect, it } from "vitest";
import { solesACentimos, tasasSchema } from "./tasa.schema";

describe("solesACentimos", () => {
  it.each([
    ["150", 15000],
    ["150.50", 15050],
    ["150,5", 15050],
    ["19.99", 1999],
    ["1.15", 115],
    ["0.29", 29],
  ])("%s -> %i", (texto, centimos) => {
    expect(solesACentimos(texto)).toBe(centimos);
  });

  it.each(["", "abc", "-5", "10.999", "1.", ".5", "1e3", "1 000"])("rechaza %j", (texto) => {
    expect(solesACentimos(texto)).toBeNull();
  });
});

describe("tasasSchema", () => {
  const ok = { posterior: "150", previa: "300,5" };

  it("acepta y convierte a céntimos", () => {
    expect(tasasSchema.parse(ok)).toEqual({ posterior: 15000, previa: 30050 });
    expect(tasasSchema.parse({ posterior: " 5 ", previa: "5000.00" })).toEqual({ posterior: 500, previa: 500000 });
  });

  it.each([
    ["", "Escribe el monto."],
    ["abc", "Escribe un monto válido, por ejemplo 150 o 150.50."],
    ["-10", "Escribe un monto válido, por ejemplo 150 o 150.50."],
    ["10.999", "Escribe un monto válido, por ejemplo 150 o 150.50."],
    ["4.99", "El monto debe estar entre S/ 5.00 y S/ 5,000.00."],
    ["5000.01", "El monto debe estar entre S/ 5.00 y S/ 5,000.00."],
  ])("rechaza %j con mensaje por campo", (valor, mensaje) => {
    const r = tasasSchema.safeParse({ ...ok, posterior: valor });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errores = r.error.flatten().fieldErrors;
      expect(errores.posterior).toEqual([mensaje]);
      expect(errores.previa).toBeUndefined();
    }
  });

  it("campo ausente", () => {
    expect(tasasSchema.safeParse({ posterior: "150" }).success).toBe(false);
  });
});
