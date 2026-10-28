import { describe, expect, it } from "vitest";
import { parseFechaLima } from "@/modules/inspecciones/utils/fecha-diligencia";
import {
  calcularLimiteSubsanacion,
  plazoSubsanacionDias,
  validarReprogramacion,
} from "@/modules/inspecciones/utils/plazo-subsanacion";

const lima = (f: string) => parseFechaLima(f) as Date;

describe("plazo de subsanación", () => {
  it("3 días en posterior y 20 en previa", () => {
    expect(plazoSubsanacionDias("POSTERIOR")).toBe(3);
    expect(plazoSubsanacionDias("PREVIA")).toBe(20);
  });

  it("calcula el límite", () => {
    const suspendida = new Date("2026-10-28T15:00:00Z");
    expect(calcularLimiteSubsanacion("POSTERIOR", suspendida).toISOString()).toBe("2026-11-02T05:00:00.000Z");
    expect(calcularLimiteSubsanacion("PREVIA", suspendida).toISOString()).toBe("2026-11-25T05:00:00.000Z");
  });
});

describe("validarReprogramacion", () => {
  const ahora = new Date("2026-10-29T15:00:00Z");
  const limite = lima("2026-11-02");

  it.each([
    ["2026-10-29", "ok"],
    ["2026-11-02", "ok"],
    ["2026-10-28", "pasada"],
    ["2026-11-03", "fuera_de_plazo"],
  ])("%s -> %s", (fecha, esperado) => {
    expect(validarReprogramacion(lima(fecha), limite, ahora)).toBe(esperado);
  });
});
