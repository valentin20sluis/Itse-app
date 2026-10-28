import { describe, expect, it } from "vitest";

import { cambioEstadoSchema, cambioRiesgoSchema } from "./cambio-estado.schema";

const motivo = (n: number) => "a".repeat(n);

describe("cambioEstadoSchema", () => {
  it.each(["EN_REVISION", "ENVIADO_JEFATURA", "APROBADO_JEFATURA"])("motivo opcional en %s", (hasta) => {
    expect(cambioEstadoSchema.safeParse({ hasta, comentario: "" }).success).toBe(true);
    expect(cambioEstadoSchema.safeParse({ hasta, comentario: "ok" }).success).toBe(true);
  });

  it("rechaza EN_TRAMITE_EXTERNO", () => {
    expect(cambioEstadoSchema.safeParse({ hasta: "EN_TRAMITE_EXTERNO", comentario: "" }).success).toBe(false);
  });

  it.each(["OBSERVADO_REQUISITOS", "ANULADO"])("%s exige motivo de 10 a 500", (hasta) => {
    expect(cambioEstadoSchema.safeParse({ hasta, comentario: "" }).success).toBe(false);
    expect(cambioEstadoSchema.safeParse({ hasta, comentario: motivo(9) }).success).toBe(false);
    expect(cambioEstadoSchema.safeParse({ hasta, comentario: motivo(10) }).success).toBe(true);
    expect(cambioEstadoSchema.safeParse({ hasta, comentario: motivo(500) }).success).toBe(true);
    expect(cambioEstadoSchema.safeParse({ hasta, comentario: motivo(501) }).success).toBe(false);
  });

  it("máximo 500 también cuando es opcional", () => {
    expect(cambioEstadoSchema.safeParse({ hasta: "EN_REVISION", comentario: motivo(501) }).success).toBe(false);
  });

  it("rechaza destinos inválidos", () => {
    expect(cambioEstadoSchema.safeParse({ hasta: "ENTREGADO", comentario: "" }).success).toBe(false);
    expect(cambioEstadoSchema.safeParse({ hasta: "", comentario: "" }).success).toBe(false);
  });
});

describe("cambioRiesgoSchema", () => {
  it("valida nivel y nota", () => {
    expect(cambioRiesgoSchema.safeParse({ nivelRiesgo: "ALTO", nota: motivo(10) }).success).toBe(true);
    expect(cambioRiesgoSchema.safeParse({ nivelRiesgo: "ALTO", nota: motivo(9) }).success).toBe(false);
    expect(cambioRiesgoSchema.safeParse({ nivelRiesgo: "ALTO", nota: motivo(501) }).success).toBe(false);
    expect(cambioRiesgoSchema.safeParse({ nivelRiesgo: "X", nota: motivo(10) }).success).toBe(false);
  });
});
