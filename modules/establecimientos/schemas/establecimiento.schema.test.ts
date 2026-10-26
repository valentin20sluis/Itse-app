import { describe, expect, it } from "vitest";
import { establecimientoSchema } from "./establecimiento.schema";

const valido = {
  nombreComercial: "Bodega Don Pepe",
  direccion: "Av. Lima 123",
  distrito: "Miraflores",
  giro: "Bodega",
  areaM2: "120.5",
  numeroPisos: "2",
};

const mensaje = (data: Record<string, unknown>, campo: string) => {
  const r = establecimientoSchema.safeParse(data);
  if (r.success) return undefined;
  return r.error.issues.find((i) => i.path[0] === campo)?.message;
};

describe("establecimientoSchema", () => {
  it("acepta un registro válido, recorta espacios y convierte números", () => {
    const r = establecimientoSchema.parse({
      ...valido,
      nombreComercial: "  Bodega Don Pepe  ",
    });
    expect(r.nombreComercial).toBe("Bodega Don Pepe");
    expect(r.areaM2).toBe(120.5);
    expect(r.numeroPisos).toBe(2);
  });

  it.each(["nombreComercial", "direccion", "distrito", "giro"])(
    "rechaza %s vacío o solo espacios",
    (campo) => {
      expect(mensaje({ ...valido, [campo]: "" }, campo)).toMatch(/^Ingresa /);
      expect(mensaje({ ...valido, [campo]: "   " }, campo)).toMatch(/^Ingresa /);
    },
  );

  it.each([
    ["nombreComercial", 3, 100],
    ["direccion", 5, 200],
    ["distrito", 2, 80],
    ["giro", 3, 100],
  ] as const)("%s respeta longitud mínima %i y máxima %i", (campo, min, max) => {
    expect(establecimientoSchema.safeParse({ ...valido, [campo]: "a".repeat(min) }).success).toBe(true);
    expect(establecimientoSchema.safeParse({ ...valido, [campo]: "a".repeat(max) }).success).toBe(true);
    expect(mensaje({ ...valido, [campo]: "a".repeat(min - 1) }, campo)).toContain("al menos");
    expect(mensaje({ ...valido, [campo]: "a".repeat(max + 1) }, campo)).toContain("como máximo");
  });

  it("rechaza areaM2 0, negativa, no numérica y mayor a 100000", () => {
    expect(mensaje({ ...valido, areaM2: "0" }, "areaM2")).toBe("El área debe ser mayor que 0.");
    expect(mensaje({ ...valido, areaM2: "-5" }, "areaM2")).toBe("El área debe ser mayor que 0.");
    expect(mensaje({ ...valido, areaM2: "abc" }, "areaM2")).toBe("Ingresa un área válida en m².");
    expect(mensaje({ ...valido, areaM2: "100001" }, "areaM2")).toBe("El área no puede superar 100000 m².");
    expect(establecimientoSchema.safeParse({ ...valido, areaM2: "100000" }).success).toBe(true);
  });

  it("rechaza numeroPisos 0, 51, decimal y no numérico", () => {
    expect(mensaje({ ...valido, numeroPisos: "0" }, "numeroPisos")).toBe("Debe tener al menos 1 piso.");
    expect(mensaje({ ...valido, numeroPisos: "51" }, "numeroPisos")).toBe("No puede tener más de 50 pisos.");
    expect(mensaje({ ...valido, numeroPisos: "1.5" }, "numeroPisos")).toBe("El número de pisos debe ser un entero.");
    expect(mensaje({ ...valido, numeroPisos: "abc" }, "numeroPisos")).toBe("Ingresa un número de pisos válido.");
    expect(establecimientoSchema.safeParse({ ...valido, numeroPisos: "50" }).success).toBe(true);
  });
});
