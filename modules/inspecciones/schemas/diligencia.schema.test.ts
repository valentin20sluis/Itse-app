import { describe, expect, it } from "vitest";
import {
  programacionSchema,
  resultadoDiligenciaSchema,
} from "@/modules/inspecciones/schemas/diligencia.schema";

describe("programacionSchema", () => {
  it("convierte la fecha al inicio del día en Lima (UTC)", () => {
    const r = programacionSchema.parse({ programadaPara: "2026-11-03" });
    expect(r.programadaPara.toISOString()).toBe("2026-11-03T05:00:00.000Z");
  });

  it.each(["", "2026-11-03T10:30", "2026-02-31", "abc"])("rechaza %j", (v) => {
    expect(programacionSchema.safeParse({ programadaPara: v }).success).toBe(false);
  });
});

describe("resultadoDiligenciaSchema", () => {
  const ok = (informe: string) => resultadoDiligenciaSchema.safeParse({ resultado: "CUMPLE", informe });

  it("informe: límites 9/10/1000/1001 y espacios", () => {
    expect(ok("x".repeat(9)).success).toBe(false);
    expect(ok("x".repeat(10)).success).toBe(true);
    expect(ok("x".repeat(1000)).success).toBe(true);
    expect(ok("x".repeat(1001)).success).toBe(false);
    expect(ok("   " + "x".repeat(9) + "   ").success).toBe(false);
    const r = ok("  " + "x".repeat(10) + "  ");
    expect(r.success && r.data.informe).toBe("x".repeat(10));
  });

  it("resultado: solo CUMPLE o NO_CUMPLE", () => {
    const informe = "x".repeat(10);
    expect(resultadoDiligenciaSchema.safeParse({ resultado: "NO_CUMPLE", informe }).success).toBe(true);
    for (const resultado of ["EN_SUBSANACION", "ANULADO", "", undefined]) {
      expect(resultadoDiligenciaSchema.safeParse({ resultado, informe }).success).toBe(false);
    }
  });
});
