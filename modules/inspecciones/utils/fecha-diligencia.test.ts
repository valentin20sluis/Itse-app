import { describe, expect, it } from "vitest";
import {
  aInputLima,
  parseFechaLima,
  validarProgramacion,
} from "@/modules/inspecciones/utils/fecha-diligencia";

describe("parseFechaLima", () => {
  it("devuelve el inicio del día en Lima (05:00 UTC)", () => {
    expect(parseFechaLima("2026-11-03")?.toISOString()).toBe("2026-11-03T05:00:00.000Z");
    expect(parseFechaLima("2026-12-31")?.toISOString()).toBe("2026-12-31T05:00:00.000Z");
  });

  it.each(["", "2026-11-03T10:30", "03/11/2026", "2026-02-31", "2026-13-01", "2026-11-3"])(
    "devuelve null para %j",
    (v) => {
      expect(parseFechaLima(v)).toBeNull();
    },
  );
});

describe("aInputLima", () => {
  it("da la fecha calendario de Lima", () => {
    expect(aInputLima(new Date("2026-11-03T05:00:00.000Z"))).toBe("2026-11-03");
    expect(aInputLima(new Date("2026-11-03T04:59:00.000Z"))).toBe("2026-11-02");
    expect(aInputLima(parseFechaLima("2026-11-03")!)).toBe("2026-11-03");
  });
});

describe("validarProgramacion", () => {
  // 2026-11-01 20:00 en Lima
  const ahora = new Date("2026-11-02T01:00:00.000Z");
  const dia = (s: string) => parseFechaLima(s)!;

  it("límites exactos", () => {
    expect(validarProgramacion(dia("2026-10-31"), ahora)).toBe("pasada");
    expect(validarProgramacion(dia("2026-11-01"), ahora)).toBe("ok");
    expect(validarProgramacion(dia("2026-11-02"), ahora)).toBe("ok");
    expect(validarProgramacion(dia("2026-01-30"), ahora)).toBe("pasada");
    expect(validarProgramacion(dia("2027-01-30"), ahora)).toBe("ok");
    expect(validarProgramacion(dia("2027-01-31"), ahora)).toBe("muy_lejana");
  });
});
