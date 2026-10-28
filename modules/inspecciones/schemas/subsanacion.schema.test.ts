import { describe, expect, it } from "vitest";
import { evaluacionSubsanacionSchema } from "@/modules/inspecciones/schemas/subsanacion.schema";

const parse = (resultado: unknown) =>
  evaluacionSubsanacionSchema.safeParse({ resultado });

describe("evaluacionSubsanacionSchema", () => {
  it.each(["CUMPLE", "SIGUE_EN_SUBSANACION", "NO_CUMPLE"])("acepta %s", (resultado) => {
    expect(parse(resultado).success).toBe(true);
  });

  it.each(["EN_SUBSANACION", "ANULADO", "", undefined])("rechaza el resultado %j", (resultado) => {
    const r = parse(resultado);
    expect(!r.success && r.error.issues[0].message).toBe("Elige el resultado.");
  });
});
