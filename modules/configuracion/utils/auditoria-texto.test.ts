import { describe, expect, it } from "vitest";
import { describirCambioConfig } from "@/modules/configuracion/utils/auditoria-texto";

const item = (accion: "CREAR" | "EDITAR" | "ELIMINAR" | "ACTIVAR" | "DESACTIVAR", extra = {}) => ({
  accion,
  referencia: "2026-12-25",
  valorAnterior: null,
  valorNuevo: null,
  ...extra,
});

describe("describirCambioConfig: feriados", () => {
  it("agregar", () => {
    expect(describirCambioConfig("FERIADO", item("CREAR", { valorNuevo: "Navidad" }))).toBe(
      "Agregó el feriado “Navidad” (25/12/2026)",
    );
  });

  it("renombrar", () => {
    expect(describirCambioConfig("FERIADO", item("EDITAR", { valorAnterior: "A", valorNuevo: "B" }))).toBe(
      "Cambió el nombre de 25/12/2026: “A” → “B”",
    );
  });

  it("eliminar", () => {
    expect(describirCambioConfig("FERIADO", item("ELIMINAR", { valorAnterior: "Navidad" }))).toBe(
      "Eliminó el feriado “Navidad” (25/12/2026)",
    );
  });
});

describe("describirCambioConfig: observaciones", () => {
  it.each([
    ["CREAR", "Agregó"],
    ["EDITAR", "Cambió"],
    ["DESACTIVAR", "Desactivó"],
    ["ACTIVAR", "Reactivó"],
  ] as const)("%s", (accion, verbo) => {
    expect(describirCambioConfig("OBSERVACION", item(accion, { valorNuevo: "Extintores vencidos" }))).toBe(
      `${verbo} la observación “Extintores vencidos”`,
    );
  });
});

describe("describirCambioConfig: tasas", () => {
  it("formatea los céntimos y el tipo de ITSE", () => {
    const posterior = item("EDITAR", { referencia: "POSTERIOR", valorAnterior: "15000", valorNuevo: "16050" });
    expect(describirCambioConfig("TASA", posterior)).toBe("Cambió la tasa de ITSE posterior: S/ 150.00 → S/ 160.50");
    expect(describirCambioConfig("TASA", { ...posterior, referencia: "PREVIA" })).toBe(
      "Cambió la tasa de ITSE previa: S/ 150.00 → S/ 160.50",
    );
  });

  it("monto ausente muestra un guion", () => {
    expect(describirCambioConfig("TASA", item("EDITAR", { referencia: "PREVIA", valorNuevo: "100" }))).toBe(
      "Cambió la tasa de ITSE previa: — → S/ 1.00",
    );
  });
});
