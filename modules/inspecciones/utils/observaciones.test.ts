import { describe, expect, it } from "vitest";
import { evaluarObservaciones } from "./observaciones";

const catalogo = [
  { codigo: "A", descripcion: "Alfa" },
  { codigo: "B", descripcion: "Beta" },
];
const [a, b] = catalogo.map((o) => o.codigo);

describe.each(["POSTERIOR", "PREVIA"] as const)("evaluarObservaciones %s", (tipo) => {
  const relevanteEnPosterior = tipo === "POSTERIOR" ? { ok: false, motivo: "relevante" } : { ok: true };
  const evaluar = (codigos: string[], libres: string[], cat = catalogo) =>
    evaluarObservaciones(tipo, { codigos, libres }, cat);

  it("vacío", () => {
    expect(evaluar([], [])).toEqual({ ok: false, motivo: "sin_observaciones" });
  });
  it("solo catálogo", () => {
    expect(evaluar([a, b], [])).toEqual({ ok: true });
  });
  it("solo libres", () => {
    expect(evaluar([], ["Grieta en columna"])).toEqual(relevanteEnPosterior);
  });
  it("mezcla", () => {
    expect(evaluar([a], ["Grieta en columna"])).toEqual(relevanteEnPosterior);
  });
  it("código inválido y repetido, antes que relevante", () => {
    const invalido = { ok: false, motivo: "codigo_invalido" };
    expect(evaluar(["x"], ["algo largo"])).toEqual(invalido);
    expect(evaluar([a, a], [])).toEqual(invalido);
  });
  it("un código desactivado (fuera del catálogo recibido) es inválido", () => {
    expect(evaluar([b], [], [catalogo[0]])).toEqual({ ok: false, motivo: "codigo_invalido" });
    expect(evaluar([a], [], [])).toEqual({ ok: false, motivo: "codigo_invalido" });
  });
});
