import { describe, expect, it } from "vitest";
import { feriadoSchema } from "@/modules/configuracion/schemas/feriado.schema";

const ok = { fecha: "2026-12-25", nombre: "Navidad" };

describe("feriadoSchema", () => {
  it("acepta datos válidos y recorta el nombre", () => {
    expect(feriadoSchema.parse({ ...ok, nombre: "  Navidad  " })).toEqual(ok);
  });

  it.each(["2026-02-30", "25/12/2026", "2026-1-5", "", "2019-12-31", "2101-01-01"])(
    "rechaza la fecha %j",
    (fecha) => {
      expect(feriadoSchema.safeParse({ ...ok, fecha }).success).toBe(false);
    },
  );

  it("acepta los extremos 2020 y 2100", () => {
    expect(feriadoSchema.safeParse({ ...ok, fecha: "2020-01-01" }).success).toBe(true);
    expect(feriadoSchema.safeParse({ ...ok, fecha: "2100-12-31" }).success).toBe(true);
  });

  it.each(["", "  ", "ab", " ab ", "a".repeat(81)])("rechaza el nombre %j", (nombre) => {
    expect(feriadoSchema.safeParse({ ...ok, nombre }).success).toBe(false);
  });

  it("acepta nombres de 3 y 80 caracteres", () => {
    expect(feriadoSchema.safeParse({ ...ok, nombre: "abc" }).success).toBe(true);
    expect(feriadoSchema.safeParse({ ...ok, nombre: "a".repeat(80) }).success).toBe(true);
  });
});
