import { describe, expect, it } from "vitest";

import { ESTADO_LABELS, type EstadoExpediente } from "@/modules/expedientes/constants/estado-labels";
import {
  ESTADOS_FINALES,
  TRANSICIONES,
  puedeTransicionar,
  requiereMotivo,
  transicionesPermitidas,
} from "@/modules/expedientes/utils/transiciones";

const ESTADOS = Object.keys(ESTADO_LABELS) as EstadoExpediente[];

const ESPERADAS = new Set<string>([
  "PRESENTADO>EN_REVISION",
  "EN_REVISION>OBSERVADO_REQUISITOS",
  "EN_REVISION>EN_TRAMITE_EXTERNO",
  ...ESTADOS.filter((e) => e !== "BORRADOR" && !ESTADOS_FINALES.includes(e)).map(
    (e) => `${e}>ANULADO`,
  ),
]);

describe("transiciones", () => {
  it("matriz 16 x 16 de TRANSICIONES coincide con la lista esperada", () => {
    expect(ESTADOS).toHaveLength(16);
    for (const desde of ESTADOS) {
      for (const hasta of ESTADOS) {
        expect(TRANSICIONES[desde].includes(hasta), `${desde}>${hasta}`).toBe(
          ESPERADAS.has(`${desde}>${hasta}`),
        );
      }
    }
  });

  it("superadmin: PRESENTADO y EN_REVISION", () => {
    expect(transicionesPermitidas("PRESENTADO", "superadmin")).toEqual(["EN_REVISION", "ANULADO"]);
    expect(transicionesPermitidas("EN_REVISION", "superadmin")).toEqual([
      "OBSERVADO_REQUISITOS",
      "EN_TRAMITE_EXTERNO",
      "ANULADO",
    ]);
  });

  it("admin no puede anular", () => {
    expect(transicionesPermitidas("PRESENTADO", "admin")).toEqual(["EN_REVISION"]);
    expect(transicionesPermitidas("EN_REVISION", "admin")).toEqual([
      "OBSERVADO_REQUISITOS",
      "EN_TRAMITE_EXTERNO",
    ]);
    expect(transicionesPermitidas("OBSERVADO_REQUISITOS", "admin")).toEqual([]);
    expect(puedeTransicionar("PRESENTADO", "ANULADO", "admin")).toBe(false);
    expect(puedeTransicionar("PRESENTADO", "ANULADO", "superadmin")).toBe(true);
  });

  it("OBSERVADO_REQUISITOS y EN_TRAMITE_EXTERNO solo ANULADO (superadmin)", () => {
    for (const e of ["OBSERVADO_REQUISITOS", "EN_TRAMITE_EXTERNO"] as const) {
      expect(transicionesPermitidas(e, "superadmin")).toEqual(["ANULADO"]);
    }
  });

  it("BORRADOR y estados finales sin salidas, para cualquier rol", () => {
    for (const e of ["BORRADOR", ...ESTADOS_FINALES] as EstadoExpediente[]) {
      for (const rol of ["admin", "superadmin", "cliente"] as const) {
        expect(transicionesPermitidas(e, rol)).toEqual([]);
      }
    }
  });

  it("cliente no tiene transiciones", () => {
    for (const e of ESTADOS) expect(transicionesPermitidas(e, "cliente")).toEqual([]);
    expect(puedeTransicionar("PRESENTADO", "EN_REVISION", "cliente")).toBe(false);
  });

  it("no existe EN_REVISION > INSPECTOR_DESIGNADO", () => {
    expect(puedeTransicionar("EN_REVISION", "INSPECTOR_DESIGNADO", "superadmin")).toBe(false);
  });

  it("requiereMotivo solo para OBSERVADO_REQUISITOS y ANULADO", () => {
    for (const e of ESTADOS) {
      expect(requiereMotivo(e)).toBe(e === "OBSERVADO_REQUISITOS" || e === "ANULADO");
    }
  });
});
