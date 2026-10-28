import { describe, expect, it } from "vitest";
import { esDiaHabil, estadoPlazo, sumarDiasHabiles } from "@/modules/inspecciones/utils/dias-habiles";
import { parseFechaLima } from "@/modules/inspecciones/utils/fecha-diligencia";

const lima = (f: string) => parseFechaLima(f) as Date;
const iso = (d: Date) => d.toISOString();

const FERIADOS = ["2026-11-01", "2026-12-08", "2026-12-09", "2026-12-25"];

describe("esDiaHabil", () => {
  it("distingue hábiles, fines de semana y feriados", () => {
    expect(esDiaHabil("2026-10-28", FERIADOS)).toBe(true);
    expect(esDiaHabil("2026-10-30", FERIADOS)).toBe(true);
    expect(esDiaHabil("2026-10-31", FERIADOS)).toBe(false);
    expect(esDiaHabil("2026-11-01", FERIADOS)).toBe(false);
    expect(esDiaHabil("2026-12-08", FERIADOS)).toBe(false);
  });

  it("sin feriados solo excluye fines de semana", () => {
    expect(esDiaHabil("2026-10-28", ["2026-10-28"])).toBe(false);
    expect(esDiaHabil("2026-12-08", [])).toBe(true);
  });
});

describe("sumarDiasHabiles", () => {
  it("n = 0 devuelve el inicio del mismo día", () => {
    expect(iso(sumarDiasHabiles(new Date("2026-10-28T15:00:00Z"), 0, FERIADOS))).toBe(iso(lima("2026-10-28")));
  });

  it.each([
    ["2026-10-28", 3, "2026-11-02"],
    ["2026-10-30", 1, "2026-11-02"],
    ["2026-10-31", 1, "2026-11-02"],
    ["2026-12-04", 3, "2026-12-11"],
    ["2026-10-28", 20, "2026-11-25"],
  ])("%s + %i = %s", (desde, n, esperado) => {
    expect(iso(sumarDiasHabiles(lima(desde), n, FERIADOS))).toBe(iso(lima(esperado)));
  });

  it("lanza RangeError con n negativo o no entero", () => {
    expect(() => sumarDiasHabiles(new Date(), -1, FERIADOS)).toThrow(RangeError);
    expect(() => sumarDiasHabiles(new Date(), 1.5, FERIADOS)).toThrow(RangeError);
  });

  it("usa la fecha de Lima cerca de la medianoche", () => {
    expect(iso(sumarDiasHabiles(new Date("2026-10-29T04:59:00Z"), 0, FERIADOS))).toBe(iso(lima("2026-10-28")));
    expect(iso(sumarDiasHabiles(new Date("2026-10-29T05:00:00Z"), 0, FERIADOS))).toBe(iso(lima("2026-10-29")));
  });
});

describe("estadoPlazo", () => {
  const limite = lima("2026-11-02");

  it.each([
    [lima("2026-10-28"), { vencido: false, diasRestantes: 3 }],
    [lima("2026-10-31"), { vencido: false, diasRestantes: 1 }],
    [new Date("2026-11-02T20:00:00Z"), { vencido: false, diasRestantes: 0 }],
    [new Date("2026-11-03T04:59:00Z"), { vencido: false, diasRestantes: 0 }],
    [new Date("2026-11-03T05:00:00Z"), { vencido: true, diasRestantes: 0 }],
  ])("ahora %s", (ahora, esperado) => {
    expect(estadoPlazo(limite, ahora, FERIADOS)).toEqual(esperado);
  });
});
