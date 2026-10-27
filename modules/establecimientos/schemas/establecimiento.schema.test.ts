import { describe, expect, it } from "vitest";
import { FUNCION_VALUES } from "@/modules/establecimientos/constants/funciones";
import { establecimientoSchema } from "./establecimiento.schema";

const valido = {
  razonSocial: "Bodega Don Pepe SAC",
  ruc: "20123456789",
  nombreComercial: "Bodega Don Pepe",
  direccion: "Av. Lima 123",
  distrito: "Miraflores",
  numeroGiro: "G-123",
  funcion: "COMERCIO",
  giro: "Bodega",
  areaM2: "120.5",
  numeroPisos: "2",
  pisoEstablecimiento: "1",
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

  it.each(FUNCION_VALUES)("funcion acepta %s", (funcion) => {
    expect(establecimientoSchema.safeParse({ ...valido, funcion }).success).toBe(true);
  });

  it("funcion rechaza vacío, ausente o fuera de la lista", () => {
    const msg = "Selecciona la función del establecimiento.";
    expect(mensaje({ ...valido, funcion: "" }, "funcion")).toBe(msg);
    expect(mensaje({ ...valido, funcion: "MINERIA" }, "funcion")).toBe(msg);
    expect(mensaje({ ...valido, funcion: undefined }, "funcion")).toBe(msg);
    expect(mensaje({ ...valido, funcion: null }, "funcion")).toBe(msg);
  });

  it.each(["2012345678", "2012345678a", "201234567890", ""])("rechaza RUC %j", (ruc) => {
    expect(mensaje({ ...valido, ruc }, "ruc")).toBe("El RUC debe tener 11 dígitos.");
  });

  it.each(["razonSocial", "nombreComercial", "direccion", "distrito", "numeroGiro", "giro"])(
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
    ["giro", 3, 300],
  ] as const)("%s respeta longitud mínima %i y máxima %i", (campo, min, max) => {
    expect(establecimientoSchema.safeParse({ ...valido, [campo]: "a".repeat(min) }).success).toBe(true);
    expect(establecimientoSchema.safeParse({ ...valido, [campo]: "a".repeat(max) }).success).toBe(true);
    expect(mensaje({ ...valido, [campo]: "a".repeat(min - 1) }, campo)).toContain("al menos");
    expect(mensaje({ ...valido, [campo]: "a".repeat(max + 1) }, campo)).toContain("como máximo");
  });

  it("numeroGiro acepta letras, números y guion, y recorta espacios", () => {
    expect(establecimientoSchema.parse({ ...valido, numeroGiro: "  AB-12  " }).numeroGiro).toBe("AB-12");
    expect(establecimientoSchema.safeParse({ ...valido, numeroGiro: "a".repeat(20) }).success).toBe(true);
  });

  it("numeroGiro rechaza caracteres inválidos y más de 20", () => {
    expect(mensaje({ ...valido, numeroGiro: "12 34" }, "numeroGiro")).toBe("Usa solo letras, números y guion.");
    expect(mensaje({ ...valido, numeroGiro: "12/34" }, "numeroGiro")).toBe("Usa solo letras, números y guion.");
    expect(mensaje({ ...valido, numeroGiro: "a".repeat(21) }, "numeroGiro")).toContain("como máximo");
  });

  it("rechaza areaM2 0, negativa, no numérica y mayor a 100000", () => {
    expect(mensaje({ ...valido, areaM2: "0" }, "areaM2")).toBe("El área debe ser mayor que 0.");
    expect(mensaje({ ...valido, areaM2: "-5" }, "areaM2")).toBe("El área debe ser mayor que 0.");
    expect(mensaje({ ...valido, areaM2: "abc" }, "areaM2")).toBe("Ingresa un área válida en m².");
    expect(mensaje({ ...valido, areaM2: "100001" }, "areaM2")).toBe("El área no puede superar 100000 m².");
    expect(establecimientoSchema.safeParse({ ...valido, areaM2: "100000" }).success).toBe(true);
  });

  it("rechaza numeroPisos 0, 51, decimal y no numérico", () => {
    expect(mensaje({ ...valido, numeroPisos: "0" }, "numeroPisos")).toBe("La edificación debe tener al menos 1 piso.");
    expect(mensaje({ ...valido, numeroPisos: "51" }, "numeroPisos")).toBe("La edificación no puede tener más de 50 pisos.");
    expect(mensaje({ ...valido, numeroPisos: "1.5" }, "numeroPisos")).toBe(
      "El número de pisos de la edificación debe ser un entero.",
    );
    expect(mensaje({ ...valido, numeroPisos: "abc" }, "numeroPisos")).toBe(
      "Ingresa un número de pisos de la edificación válido.",
    );
    expect(establecimientoSchema.safeParse({ ...valido, numeroPisos: "50" }).success).toBe(true);
  });

  it("pisoEstablecimiento válido se convierte a número, también igual a los pisos", () => {
    expect(establecimientoSchema.parse(valido).pisoEstablecimiento).toBe(1);
    expect(establecimientoSchema.safeParse({ ...valido, pisoEstablecimiento: "2" }).success).toBe(true);
  });

  it("pisoEstablecimiento rechaza vacío, 0, 51, decimal y no numérico", () => {
    expect(mensaje({ ...valido, pisoEstablecimiento: "" }, "pisoEstablecimiento")).toBe("El piso debe ser al menos 1.");
    expect(mensaje({ ...valido, pisoEstablecimiento: "0" }, "pisoEstablecimiento")).toBe("El piso debe ser al menos 1.");
    expect(mensaje({ ...valido, pisoEstablecimiento: "51", numeroPisos: "50" }, "pisoEstablecimiento")).toBe(
      "El piso no puede ser mayor que 50.",
    );
    expect(mensaje({ ...valido, pisoEstablecimiento: "1.5" }, "pisoEstablecimiento")).toBe("El piso debe ser un entero.");
    expect(mensaje({ ...valido, pisoEstablecimiento: "abc" }, "pisoEstablecimiento")).toBe("Ingresa un piso válido.");
  });

  it("pisoEstablecimiento no puede ser mayor que los pisos de la edificación", () => {
    expect(mensaje({ ...valido, numeroPisos: "2", pisoEstablecimiento: "3" }, "pisoEstablecimiento")).toBe(
      "No puede ser mayor que el número de pisos de la edificación.",
    );
  });
});
