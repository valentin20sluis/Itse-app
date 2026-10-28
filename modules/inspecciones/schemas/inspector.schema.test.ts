import { describe, expect, it } from "vitest";
import { inspectorSchema } from "./inspector.schema";

const base = {
  nombres: "Ana María",
  apellidos: "Quispe Rojas",
  documento: "12345678",
  telefono: "987654321",
  email: "ana@example.com",
};

const camposInvalidos = (override: Record<string, unknown>) => {
  const r = inspectorSchema.safeParse({ ...base, ...override });
  return r.success ? null : Object.keys(r.error.flatten().fieldErrors);
};

describe("inspectorSchema", () => {
  it("acepta datos válidos", () => {
    expect(inspectorSchema.safeParse(base).success).toBe(true);
  });

  it("recorta espacios y pasa el correo a minúsculas", () => {
    const r = inspectorSchema.safeParse({
      ...base,
      nombres: "  Ana  ",
      email: "  ANA@Example.com ",
    });
    expect(r.success && r.data.nombres).toBe("Ana");
    expect(r.success && r.data.email).toBe("ana@example.com");
  });

  it.each([
    [{ nombres: "A" }, "nombres"],
    [{ nombres: "   " }, "nombres"],
    [{ apellidos: "x".repeat(81) }, "apellidos"],
    [{ documento: "1234" }, "documento"],
    [{ documento: "123456789" }, "documento"],
    [{ documento: "12a45" }, "documento"],
    [{ telefono: "887654321" }, "telefono"],
    [{ telefono: "98765432" }, "telefono"],
    [{ email: "no-es-correo" }, "email"],
    [{ email: `${"a".repeat(120)}@example.com` }, "email"],
  ])("rechaza %j", (override, campo) => {
    expect(camposInvalidos(override)).toContain(campo);
  });

  it("acepta documentos de 5 y 8 dígitos", () => {
    expect(camposInvalidos({ documento: "12345" })).toBeNull();
    expect(camposInvalidos({ documento: "12345678" })).toBeNull();
  });
});
