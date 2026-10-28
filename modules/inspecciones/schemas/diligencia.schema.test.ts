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

  it("resultado: CUMPLE, NO_CUMPLE o EN_SUBSANACION", () => {
    const informe = "x".repeat(10);
    expect(resultadoDiligenciaSchema.safeParse({ resultado: "NO_CUMPLE", informe }).success).toBe(true);
    expect(
      resultadoDiligenciaSchema.safeParse({ resultado: "EN_SUBSANACION", informe, codigos: ["A"] }).success,
    ).toBe(true);
    for (const resultado of ["ANULADO", "", undefined]) {
      expect(resultadoDiligenciaSchema.safeParse({ resultado, informe }).success).toBe(false);
    }
  });

  it("CUMPLE solo sin observaciones", () => {
    const base = { resultado: "CUMPLE", informe: "x".repeat(10) };
    expect(resultadoDiligenciaSchema.safeParse(base).success).toBe(true);
    for (const extra of [{ codigos: ["A"] }, { libres: ["Grieta en la pared"] }]) {
      const r = resultadoDiligenciaSchema.safeParse({ ...base, ...extra });
      expect(!r.success && r.error.issues[0].path).toEqual(["codigos"]);
    }
  });

  it("EN_SUBSANACION exige al menos una observación; líneas vacías no cuentan", () => {
    const base = { resultado: "EN_SUBSANACION", informe: "x".repeat(10) };
    for (const extra of [{}, { libres: ["", "   "] }]) {
      const r = resultadoDiligenciaSchema.safeParse({ ...base, ...extra });
      expect(!r.success && r.error.issues[0].message).toBe("Agrega al menos una observación.");
    }
  });

  it("libres: 4/5/300/301 caracteres, recorta y descarta vacías", () => {
    const libres = (l: string[]) =>
      resultadoDiligenciaSchema.safeParse({ resultado: "NO_CUMPLE", informe: "x".repeat(10), libres: l });
    expect(libres(["x".repeat(4)]).success).toBe(false);
    expect(libres(["x".repeat(5)]).success).toBe(true);
    expect(libres(["x".repeat(300)]).success).toBe(true);
    expect(libres(["x".repeat(301)]).success).toBe(false);
    expect(libres(Array.from({ length: 21 }, () => "x".repeat(5))).success).toBe(false);
    const r = libres(["  hola mundo  ", "", "   "]);
    expect(r.success && r.data.libres).toEqual(["hola mundo"]);
  });

  it("codigos: hasta 6 y por defecto vacío", () => {
    const base = { resultado: "NO_CUMPLE", informe: "x".repeat(10) };
    const r = resultadoDiligenciaSchema.safeParse(base);
    expect(r.success && r.data).toMatchObject({ codigos: [], libres: [] });
    expect(
      resultadoDiligenciaSchema.safeParse({ ...base, codigos: ["a", "b", "c", "d", "e", "f", "g"] }).success,
    ).toBe(false);
  });

  it("reprogramadaPara: fecha de Lima, vacío es ausente, imposible rechaza", () => {
    const base = { resultado: "EN_SUBSANACION", informe: "x".repeat(10), codigos: ["A"] };
    const ok = resultadoDiligenciaSchema.safeParse({ ...base, reprogramadaPara: "2026-11-10" });
    expect(ok.success && ok.data.reprogramadaPara?.toISOString()).toBe("2026-11-10T05:00:00.000Z");
    const vacio = resultadoDiligenciaSchema.safeParse({ ...base, reprogramadaPara: "" });
    expect(vacio.success && vacio.data.reprogramadaPara).toBeUndefined();
    for (const v of ["2026-02-31", "abc"]) {
      const r = resultadoDiligenciaSchema.safeParse({ ...base, reprogramadaPara: v });
      expect(!r.success && r.error.issues[0].path).toEqual(["reprogramadaPara"]);
    }
  });
});
