import { describe, expect, it } from "vitest";
import { observacionIdSchema, observacionSchema } from "./observacion.schema";

describe("observacionSchema", () => {
  it("recorta espacios", () => {
    expect(observacionSchema.parse({ descripcion: "  Retirar cajas de la salida  " })).toEqual({
      descripcion: "Retirar cajas de la salida",
    });
  });

  it.each([["", "vacía"], ["   ", "solo espacios"], ["corta", "menos de 10"], ["a".repeat(201), "más de 200"]])(
    "rechaza %j (%s)",
    (descripcion) => {
      expect(observacionSchema.safeParse({ descripcion }).success).toBe(false);
    },
  );

  it("acepta los límites 10 y 200", () => {
    expect(observacionSchema.safeParse({ descripcion: "a".repeat(10) }).success).toBe(true);
    expect(observacionSchema.safeParse({ descripcion: "a".repeat(200) }).success).toBe(true);
  });

  it("sin el campo da mensaje en español", () => {
    const r = observacionSchema.safeParse({});
    expect(!r.success && r.error.issues[0].message).toBe("Escribe la descripción de la observación.");
  });
});

describe("observacionIdSchema", () => {
  it("exige uuid", () => {
    expect(observacionIdSchema.safeParse("basura").success).toBe(false);
    expect(observacionIdSchema.safeParse("3f1b2c4e-5a6d-4e8f-9a0b-1c2d3e4f5a6b").success).toBe(true);
  });
});
