import { describe, expect, it } from "vitest";
import { faltantesBorrador } from "./completitud";

const uuid = "3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b";
const completo = {
  establecimientoId: uuid,
  tipoTramite: "NUEVA",
  nivelRiesgo: "MEDIO",
  calidadSolicitante: "PROPIETARIO",
  tieneSotano: false,
  almacenaInflamables: false,
  tieneCocina: false,
  esGrifo: false,
  numeroPisos: 1,
  usoMixtoPatrimonio: false,
  granEscala: false,
  solicitanteNombre: "Juan Pérez",
  solicitanteDocumento: "12345678",
  solicitanteTelefono: "987654321",
  solicitanteEmail: "juan@ejemplo.pe",
} as const;
const medioDocs = ["DNI_AMBAS_CARAS", "FICHA_RUC", "EXTINTORES_PQS", "CAPACITACION_EXTINTORES"] as const;

describe("faltantesBorrador", () => {
  it("borrador vacío: pasos 1 a 3 y sin documentos requeridos (nivel nulo)", () => {
    const vacio = {
      nivelRiesgo: null,
      calidadSolicitante: "PROPIETARIO" as const,
      tieneCocina: false,
      esGrifo: false,
      almacenaInflamables: false,
      numeroPisos: 1,
    };
    expect(faltantesBorrador(vacio, [])).toEqual(["paso1", "paso2", "paso3"]);
  });

  it("incluye los documentos requeridos que faltan", () => {
    expect(faltantesBorrador(completo, ["DNI_AMBAS_CARAS", "FICHA_RUC"])).toEqual([
      "EXTINTORES_PQS",
      "CAPACITACION_EXTINTORES",
    ]);
  });

  it("completo: vacía; un documento extra no requerido no bloquea", () => {
    expect(faltantesBorrador(completo, [...medioDocs])).toEqual([]);
    expect(faltantesBorrador(completo, [...medioDocs, "POZO_TIERRA"])).toEqual([]);
  });

  it("MEDIO de 2 pisos exige el Plan de seguridad", () => {
    expect(faltantesBorrador({ ...completo, numeroPisos: 2 }, [...medioDocs])).toEqual([
      "PLAN_SEGURIDAD",
    ]);
  });
});

describe("faltantesBorrador, solicitante", () => {
  it("sin DNI lo reporta; representante legal exige además la acreditación", () => {
    expect(faltantesBorrador(completo, ["FICHA_RUC", "EXTINTORES_PQS", "CAPACITACION_EXTINTORES"])).toEqual([
      "DNI_AMBAS_CARAS",
    ]);
    expect(
      faltantesBorrador({ ...completo, calidadSolicitante: "REPRESENTANTE_LEGAL" }, [...medioDocs]),
    ).toEqual(["ACREDITACION_REPRESENTACION"]);
  });
});
