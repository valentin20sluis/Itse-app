import { describe, expect, it } from "vitest";
import {
  clavesMeses,
  etiquetaMes,
  rangoDesdeHasta,
  rellenarMeses,
  ultimosMeses,
} from "@/modules/reportes/utils/rango-fechas";

const AHORA = new Date("2026-10-28T15:00:00.000Z");
const DEFECTO = { desdeInput: "2026-05-01", hastaInput: "2026-10-28" };

describe("rangoDesdeHasta", () => {
  it("por defecto: primer dia del mes de hace 5 meses hasta hoy (Lima)", () => {
    const r = rangoDesdeHasta(undefined, undefined, AHORA);
    expect(r).toMatchObject(DEFECTO);
    expect(r.desde.toISOString()).toBe("2026-05-01T05:00:00.000Z");
    expect(r.hastaExclusivo.toISOString()).toBe("2026-10-29T05:00:00.000Z");
  });

  it("respeta un rango valido", () => {
    const r = rangoDesdeHasta("2026-09-10", "2026-09-20", AHORA);
    expect(r).toMatchObject({ desdeInput: "2026-09-10", hastaInput: "2026-09-20" });
    expect(r.hastaExclusivo.toISOString()).toBe("2026-09-21T05:00:00.000Z");
  });

  it("fechas invalidas o desde > hasta vuelven al defecto", () => {
    expect(rangoDesdeHasta("2026-02-31", "2026-09-20", AHORA)).toMatchObject(DEFECTO);
    expect(rangoDesdeHasta("abc", undefined, AHORA)).toMatchObject(DEFECTO);
    expect(rangoDesdeHasta("2026-09-20", "2026-09-10", AHORA)).toMatchObject(DEFECTO);
  });

  it("recorta hasta a hoy", () => {
    expect(rangoDesdeHasta("2026-10-01", "2027-01-01", AHORA)).toMatchObject({
      desdeInput: "2026-10-01",
      hastaInput: "2026-10-28",
    });
  });

  it("recorta a 366 dias que terminan en hasta", () => {
    const r = rangoDesdeHasta("2020-01-01", "2026-06-30", AHORA);
    expect(r.hastaInput).toBe("2026-06-30");
    expect(r.desdeInput).toBe("2025-06-30");
    expect((r.hastaExclusivo.getTime() - r.desde.getTime()) / 86_400_000).toBe(366);
  });

  it("usa la fecha de Lima a medianoche: 23:30 del 31/10 Lima es 01/11 UTC", () => {
    const r = rangoDesdeHasta(undefined, undefined, new Date("2026-11-01T04:30:00.000Z"));
    expect(r.hastaInput).toBe("2026-10-31");
    expect(r.desdeInput).toBe("2026-05-01");
  });

  it("cruza el cambio de anio (enero)", () => {
    const r = rangoDesdeHasta(undefined, undefined, new Date("2027-01-10T15:00:00.000Z"));
    expect(r.desdeInput).toBe("2026-08-01");
  });
});

describe("clavesMeses", () => {
  it("lista los meses tocados sin huecos, cruzando de anio", () => {
    const r = rangoDesdeHasta("2026-11-15", "2026-11-15", new Date("2027-02-10T15:00:00.000Z"));
    expect(clavesMeses(r.desde, r.hastaExclusivo)).toEqual(["2026-11"]);
    const r2 = rangoDesdeHasta("2026-11-15", "2027-02-01", new Date("2027-02-10T15:00:00.000Z"));
    expect(clavesMeses(r2.desde, r2.hastaExclusivo)).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });

  it("el limite exclusivo a medianoche no agrega el mes siguiente", () => {
    const r = rangoDesdeHasta("2026-09-01", "2026-09-30", AHORA);
    expect(clavesMeses(r.desde, r.hastaExclusivo)).toEqual(["2026-09"]);
  });

  it("maximo 13 meses con el rango de 366 dias", () => {
    const r = rangoDesdeHasta("2020-01-01", "2026-06-30", AHORA);
    const claves = clavesMeses(r.desde, r.hastaExclusivo);
    expect(claves).toHaveLength(13);
    expect(claves[0]).toBe("2025-06");
    expect(claves[12]).toBe("2026-06");
  });
});

describe("ultimosMeses", () => {
  it("n claves terminadas en el mes actual de Lima", () => {
    expect(ultimosMeses(3, AHORA)).toEqual(["2026-08", "2026-09", "2026-10"]);
  });

  it("cruza de anio y usa Lima", () => {
    expect(ultimosMeses(3, new Date("2027-01-01T03:00:00.000Z"))).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(ultimosMeses(2, new Date("2027-01-01T06:00:00.000Z"))).toEqual(["2026-12", "2027-01"]);
  });
});

describe("etiquetaMes", () => {
  it("abrevia en espanol", () => {
    expect(etiquetaMes("2026-10")).toBe("oct 2026");
    expect(etiquetaMes("2027-01")).toBe("ene 2027");
    expect(etiquetaMes("2026-12")).toBe("dic 2026");
  });
});

describe("rellenarMeses", () => {
  it("devuelve una fila por clave con 0 donde falta", () => {
    expect(rellenarMeses(["2026-08", "2026-09", "2026-10"], [{ clave: "2026-09", cantidad: 4 }])).toEqual([
      { clave: "2026-08", cantidad: 0 },
      { clave: "2026-09", cantidad: 4 },
      { clave: "2026-10", cantidad: 0 },
    ]);
  });
});
