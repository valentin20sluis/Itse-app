import { describe, expect, it } from "vitest";
import { cambiarEstadoSchema, cambiarRolSchema } from "./usuario-gestion.schema";

const ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";

describe("cambiarRolSchema", () => {
  it("acepta id uuid y rol válido", () => {
    expect(cambiarRolSchema.safeParse({ id: ID, rol: "admin" }).success).toBe(true);
  });
  it("rechaza id no uuid y rol desconocido", () => {
    expect(cambiarRolSchema.safeParse({ id: "1", rol: "admin" }).success).toBe(false);
    expect(cambiarRolSchema.safeParse({ id: ID, rol: "root" }).success).toBe(false);
  });
});

describe("cambiarEstadoSchema", () => {
  it("acepta boolean", () => {
    expect(cambiarEstadoSchema.safeParse({ id: ID, activo: false }).success).toBe(true);
  });
  it("rechaza texto e id no uuid", () => {
    expect(cambiarEstadoSchema.safeParse({ id: ID, activo: "false" }).success).toBe(false);
    expect(cambiarEstadoSchema.safeParse({ id: "x", activo: true }).success).toBe(false);
  });
});
