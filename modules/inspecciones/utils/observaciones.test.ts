import { describe, expect, it } from "vitest";
import {
  OBSERVACIONES_NO_RELEVANTES,
  buscarObservacion,
} from "@/modules/inspecciones/constants/observaciones-no-relevantes";
import { evaluarObservaciones } from "./observaciones";

const [a, b] = OBSERVACIONES_NO_RELEVANTES.map((o) => o.codigo);

describe("catálogo", () => {
  it("tiene 6 entradas con códigos únicos", () => {
    expect(OBSERVACIONES_NO_RELEVANTES).toHaveLength(6);
    expect(new Set(OBSERVACIONES_NO_RELEVANTES.map((o) => o.codigo)).size).toBe(6);
  });

  it("buscarObservacion", () => {
    expect(buscarObservacion(a)?.descripcion).toBe(OBSERVACIONES_NO_RELEVANTES[0].descripcion);
    expect(buscarObservacion("nada")).toBeUndefined();
  });
});

describe.each(["POSTERIOR", "PREVIA"] as const)("evaluarObservaciones %s", (tipo) => {
  const relevanteEnPosterior = tipo === "POSTERIOR" ? { ok: false, motivo: "relevante" } : { ok: true };

  it("vacío", () => {
    expect(evaluarObservaciones(tipo, { codigos: [], libres: [] })).toEqual({
      ok: false,
      motivo: "sin_observaciones",
    });
  });
  it("solo catálogo", () => {
    expect(evaluarObservaciones(tipo, { codigos: [a, b], libres: [] })).toEqual({ ok: true });
  });
  it("solo libres", () => {
    expect(evaluarObservaciones(tipo, { codigos: [], libres: ["Grieta en columna"] })).toEqual(
      relevanteEnPosterior,
    );
  });
  it("mezcla", () => {
    expect(evaluarObservaciones(tipo, { codigos: [a], libres: ["Grieta en columna"] })).toEqual(
      relevanteEnPosterior,
    );
  });
  it("código inválido y repetido, antes que relevante", () => {
    const invalido = { ok: false, motivo: "codigo_invalido" };
    expect(evaluarObservaciones(tipo, { codigos: ["x"], libres: ["algo largo"] })).toEqual(invalido);
    expect(evaluarObservaciones(tipo, { codigos: [a, a], libres: [] })).toEqual(invalido);
  });
});
