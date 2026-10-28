import { describe, expect, it } from "vitest";
import { parseFechaLima } from "@/modules/inspecciones/utils/fecha-diligencia";
import { calcularVencimiento, diasParaVencer, estadoCertificado } from "./vigencia";

const lima = (s: string) => parseFechaLima(s) as Date;

describe("calcularVencimiento", () => {
  it.each([
    ["2026-03-15T15:00:00Z", "2028-03-15"],
    ["2024-02-29T15:00:00Z", "2026-02-28"],
    ["2028-02-29T15:00:00Z", "2030-02-28"],
    // 31/12/2026 23:30 en Lima ya es 01/01/2027 UTC
    ["2027-01-01T04:30:00Z", "2028-12-31"],
    // 01/01/2027 00:10 en Lima
    ["2027-01-01T05:10:00Z", "2029-01-01"],
  ])("emisión %s vence %s", (emision, esperado) => {
    expect(calcularVencimiento(new Date(emision))).toEqual(lima(esperado));
  });
});

describe("diasParaVencer y estadoCertificado", () => {
  const venceAt = lima("2028-03-15");
  const en = (dias: number) => new Date(venceAt.getTime() - dias * 86_400_000 + 3_600_000 * 10);

  it("0 el último día y negativo después", () => {
    expect(diasParaVencer(venceAt, en(0))).toBe(0);
    expect(diasParaVencer(venceAt, en(-1))).toBe(-1);
  });

  it.each([
    [61, "VIGENTE"],
    [60, "POR_VENCER"],
    [0, "POR_VENCER"],
    [-1, "VENCIDO"],
  ] as const)("faltan %i días: %s", (dias, esperado) => {
    expect(estadoCertificado({ venceAt, revocado: false }, en(dias))).toBe(esperado);
  });

  it("revocado gana sobre cualquier fecha", () => {
    expect(estadoCertificado({ venceAt, revocado: true }, en(100))).toBe("REVOCADO");
  });

  it("usa la fecha de Lima cerca de medianoche", () => {
    // 15/03/2028 23:30 Lima = 16/03/2028 04:30 UTC: sigue siendo el último día
    expect(estadoCertificado({ venceAt, revocado: false }, new Date("2028-03-16T04:30:00Z"))).toBe("POR_VENCER");
    expect(estadoCertificado({ venceAt, revocado: false }, new Date("2028-03-16T05:00:00Z"))).toBe("VENCIDO");
  });
});
