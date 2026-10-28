import { describe, expect, it } from "vitest";
import { invitarSchema } from "./invitacion.schema";

describe("invitarSchema", () => {
  it("recorta y pasa a minúsculas", () => {
    expect(invitarSchema.parse({ email: "  Ana@Muni.PE " })).toEqual({ email: "ana@muni.pe" });
  });

  it("vacío, sin formato, null o demasiado largo dan el mismo error de campo", () => {
    const largo = `${"a".repeat(250)}@muni.pe`;
    for (const email of ["", "   ", "no-es-correo", null, undefined, largo]) {
      const r = invitarSchema.safeParse({ email });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues[0].message).toBe("Escribe un correo válido.");
    }
  });
});
