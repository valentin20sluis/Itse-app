import { describe, expect, it } from "vitest";
import { evaluacionSubsanacionSchema } from "@/modules/inspecciones/schemas/subsanacion.schema";

const parse = (resultado: unknown, informe: string) =>
  evaluacionSubsanacionSchema.safeParse({ resultado, informe });

describe("evaluacionSubsanacionSchema", () => {
  it.each(["CUMPLE", "SIGUE_EN_SUBSANACION", "NO_CUMPLE"])("acepta %s", (resultado) => {
    expect(parse(resultado, "x".repeat(10)).success).toBe(true);
  });

  it.each(["EN_SUBSANACION", "ANULADO", "", undefined])("rechaza el resultado %j", (resultado) => {
    const r = parse(resultado, "x".repeat(10));
    expect(!r.success && r.error.issues[0].message).toBe("Elige el resultado.");
  });

  it("informe: límites 9/10/1000/1001 y espacios", () => {
    expect(parse("CUMPLE", "x".repeat(9)).success).toBe(false);
    expect(parse("CUMPLE", "x".repeat(10)).success).toBe(true);
    expect(parse("CUMPLE", "x".repeat(1000)).success).toBe(true);
    expect(parse("CUMPLE", "x".repeat(1001)).success).toBe(false);
    expect(parse("CUMPLE", `   ${"x".repeat(9)}   `).success).toBe(false);
    const r = parse("CUMPLE", `  ${"x".repeat(10)}  `);
    expect(r.success && r.data.informe).toBe("x".repeat(10));
  });
});
