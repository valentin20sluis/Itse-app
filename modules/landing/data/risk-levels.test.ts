import { describe, expect, it } from "vitest";
import { riskLevels } from "./risk-levels";

describe("riskLevels", () => {
  it("has four levels in order", () => {
    expect(riskLevels.map((r) => r.label)).toEqual(["Bajo", "Medio", "Alto", "Muy alto"]);
  });

  it("matches the ITSE type and inspectors of the business rules", () => {
    expect(riskLevels.map((r) => [r.itseType, r.inspectors])).toEqual([
      ["POSTERIOR", 1],
      ["POSTERIOR", 1],
      ["PREVIA", 2],
      ["PREVIA", 3],
    ]);
  });

  it("only Medio has examples", () => {
    const withExamples = riskLevels.filter((r) => r.examples);
    expect(withExamples.map((r) => r.label)).toEqual(["Medio"]);
    expect(withExamples[0].examples).toEqual(["Bodegas", "Librerías", "Boticas", "Minimarkets"]);
  });
});
