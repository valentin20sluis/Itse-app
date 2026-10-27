import { describe, expect, it } from "vitest";
import { faltantesBorrador } from "./completitud";

const uuid = "3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b";
const completo = {
  establecimientoId: uuid,
  tipoTramite: "NUEVA",
  nivelRiesgo: "MEDIO",
  tieneSotano: false,
  almacenaInflamables: false,
  tieneCocina: false,
  esGrifo: false,
  usoMixtoPatrimonio: false,
  granEscala: false,
  solicitanteNombre: "Juan Pérez",
  solicitanteDocumento: "12345678",
  solicitanteTelefono: "987654321",
  solicitanteEmail: "juan@ejemplo.pe",
} as const;
const medioDocs = ["FICHA_RUC", "EXTINTORES_PQS", "CAPACITACION_EXTINTORES"] as const;

describe("faltantesBorrador", () => {
  it("borrador vacío: pasos 1 a 3 y sin documentos requeridos (nivel nulo)", () => {
    const vacio = {
      nivelRiesgo: null,
      tieneCocina: false,
      esGrifo: false,
      almacenaInflamables: false,
    };
    expect(faltantesBorrador(vacio, [])).toEqual(["paso1", "paso2", "paso3"]);
  });

  it("incluye los documentos requeridos que faltan", () => {
    expect(faltantesBorrador(completo, ["FICHA_RUC"])).toEqual([
      "EXTINTORES_PQS",
      "CAPACITACION_EXTINTORES",
    ]);
  });

  it("completo: vacía; un documento extra no requerido no bloquea", () => {
    expect(faltantesBorrador(completo, [...medioDocs])).toEqual([]);
    expect(faltantesBorrador(completo, [...medioDocs, "POZO_TIERRA"])).toEqual([]);
  });
});
