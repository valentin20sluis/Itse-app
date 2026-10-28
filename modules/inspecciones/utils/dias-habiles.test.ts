import { describe, expect, it } from "vitest";
import { FERIADOS } from "@/modules/inspecciones/constants/feriados";
import { esDiaHabil, estadoPlazo, sumarDiasHabiles } from "@/modules/inspecciones/utils/dias-habiles";
import { parseFechaLima } from "@/modules/inspecciones/utils/fecha-diligencia";

const lima = (f: string) => parseFechaLima(f) as Date;
const iso = (d: Date) => d.toISOString();

describe("FERIADOS", () => {
  it("es válida, ordenada y sin duplicados", () => {
    expect(FERIADOS.every((f) => parseFechaLima(f) !== null)).toBe(true);
    expect([...FERIADOS].sort()).toEqual([...FERIADOS]);
    expect(new Set(FERIADOS).size).toBe(FERIADOS.length);
  });

  it("contiene exactamente las fechas de 2026 y 2027", () => {
    const comunes = ["05-01", "06-29", "07-28", "07-29", "08-30", "10-08", "11-01", "12-08", "12-09", "12-25"];
    const esperado = [
      ...["01-01", "04-02", "04-03", ...comunes].map((f) => `2026-${f}`),
      ...["01-01", "03-25", "03-26", ...comunes].map((f) => `2027-${f}`),
    ].sort();
    expect([...FERIADOS]).toEqual(esperado);
  });
});

describe("esDiaHabil", () => {
  it("distingue hábiles, fines de semana y feriados", () => {
    expect(esDiaHabil("2026-10-28")).toBe(true);
    expect(esDiaHabil("2026-10-30")).toBe(true);
    expect(esDiaHabil("2026-10-31")).toBe(false);
    expect(esDiaHabil("2026-11-01")).toBe(false);
    expect(esDiaHabil("2026-12-08")).toBe(false);
  });

  it("acepta lista de feriados inyectada", () => {
    expect(esDiaHabil("2026-10-28", ["2026-10-28"])).toBe(false);
  });
});

describe("sumarDiasHabiles", () => {
  it("n = 0 devuelve el inicio del mismo día", () => {
    expect(iso(sumarDiasHabiles(new Date("2026-10-28T15:00:00Z"), 0))).toBe(iso(lima("2026-10-28")));
  });

  it.each([
    ["2026-10-28", 3, "2026-11-02"],
    ["2026-10-30", 1, "2026-11-02"],
    ["2026-10-31", 1, "2026-11-02"],
    ["2026-12-04", 3, "2026-12-11"],
    ["2026-10-28", 20, "2026-11-25"],
  ])("%s + %i = %s", (desde, n, esperado) => {
    expect(iso(sumarDiasHabiles(lima(desde), n))).toBe(iso(lima(esperado)));
  });

  it("lanza RangeError con n negativo o no entero", () => {
    expect(() => sumarDiasHabiles(new Date(), -1)).toThrow(RangeError);
    expect(() => sumarDiasHabiles(new Date(), 1.5)).toThrow(RangeError);
  });

  it("usa la fecha de Lima cerca de la medianoche", () => {
    expect(iso(sumarDiasHabiles(new Date("2026-10-29T04:59:00Z"), 0))).toBe(iso(lima("2026-10-28")));
    expect(iso(sumarDiasHabiles(new Date("2026-10-29T05:00:00Z"), 0))).toBe(iso(lima("2026-10-29")));
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
    expect(estadoPlazo(limite, ahora)).toEqual(esperado);
  });
});
