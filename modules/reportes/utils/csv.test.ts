import { describe, expect, it } from "vitest";
import { aCsv } from "@/modules/reportes/utils/csv";

describe("aCsv", () => {
  it("lleva BOM, comillas y fin de línea CRLF", () => {
    expect(aCsv([["a", "b"], ["c", "d"]])).toBe('﻿"a","b"\r\n"c","d"\r\n');
  });

  it("escapa comillas, comas y saltos de línea", () => {
    expect(aCsv([['di "hola", ok\nfin']])).toBe('﻿"di ""hola"", ok\nfin"\r\n');
  });

  it.each(["=1+1", "+1", "-1", "@SUM(A1)", "\tx"])("neutraliza la fórmula %j", (v) => {
    expect(aCsv([[v]])).toBe(`﻿"'${v}"\r\n`);
  });

  it("no altera números ni texto normal, y los vacíos quedan como cadena vacía", () => {
    expect(aCsv([[-5, "a-b", "", null, undefined]])).toBe('﻿"-5","a-b","","",""\r\n');
  });
});
