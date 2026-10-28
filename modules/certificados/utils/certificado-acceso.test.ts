import { describe, expect, it } from "vitest";
import { ESTADO_LABELS, type EstadoExpediente } from "@/modules/expedientes/constants/estado-labels";
import type { Role } from "@/modules/usuarios/types/user.types";
import { certificadoDescargable } from "./certificado-acceso";

const ESTADOS = Object.keys(ESTADO_LABELS) as EstadoExpediente[];

describe("certificadoDescargable", () => {
  it.each(["cliente", "admin", "superadmin"] as Role[])("tabla completa para %s", (rol) => {
    for (const estado of ESTADOS) {
      const esperado =
        rol === "cliente"
          ? estado === "ENTREGADO"
          : estado === "FINALIZADO" || estado === "ENTREGADO";
      expect(certificadoDescargable(rol, estado), `${rol} ${estado}`).toBe(esperado);
    }
  });

  it("nadie descarga en pendiente de firma, en desuso o anulado", () => {
    for (const rol of ["cliente", "admin", "superadmin"] as Role[]) {
      for (const e of ["CERTIFICADO_PENDIENTE_FIRMA", "PENDIENTE_RESOLUCION", "ANULADO"] as const) {
        expect(certificadoDescargable(rol, e)).toBe(false);
      }
    }
  });
});
