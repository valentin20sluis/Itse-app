import { describe, expect, it } from "vitest";
import { declaracionTexto } from "./declaracion";

describe("declaracionTexto", () => {
  it("devuelve tres textos distintos y no vacíos", () => {
    const bajo = declaracionTexto("NUEVA", "BAJO");
    const renovacionAlto = declaracionTexto("RENOVACION", "ALTO");
    const nuevaAlto = declaracionTexto("NUEVA", "MUY_ALTO");
    expect(new Set([bajo, renovacionAlto, nuevaAlto]).size).toBe(3);
    for (const t of [bajo, renovacionAlto, nuevaAlto]) expect(t.length).toBeGreaterThan(0);
  });

  it("riesgo bajo y medio usan el mismo texto sin importar el trámite", () => {
    expect(declaracionTexto("RENOVACION", "MEDIO")).toBe(declaracionTexto("NUEVA", "BAJO"));
  });
});
