import { describe, expect, it } from "vitest";

import { estadoExpedienteEnum } from "@/db/schema";
import { ordenarPasos, siguientePaso } from "@/modules/client-area/utils/siguiente-paso";
import type { ExpedienteListItem } from "@/modules/expedientes/types/expediente.types";

// Miércoles 14-oct-2026 10:00 en Lima.
const AHORA = new Date("2026-10-14T15:00:00.000Z");
const limaMediodia = (iso: string) => new Date(`${iso}T17:00:00.000Z`);

function exp(parcial: Partial<ExpedienteListItem> = {}): ExpedienteListItem {
  return {
    id: "e1",
    numero: "EXP-2026-00001",
    estado: "PRESENTADO",
    establecimientoNombre: "Bodega Ficticia",
    nivelRiesgo: null,
    pagoPendiente: false,
    diligenciaProgramadaPara: null,
    subsanacionLimite: null,
    subsanacionPresentadaAt: null,
    resolucionNoCumpleNumero: null,
    ...parcial,
  } as ExpedienteListItem;
}

const ctx = (parcial: Partial<{ motivo: string | null; direccion: string | null; feriados: string[] }> = {}) => ({
  motivo: null,
  direccion: null,
  feriados: [] as string[],
  ahora: AHORA,
  ...parcial,
});

const paso = (e: ExpedienteListItem, c = ctx()) => siguientePaso(e, c);

describe("siguientePaso", () => {
  it("cubre todos los estados del enum (solo ANULADO no tiene paso)", () => {
    for (const estado of estadoExpedienteEnum.enumValues) {
      const r = paso(exp({ estado, nivelRiesgo: "BAJO", subsanacionLimite: limaMediodia("2026-10-20") }));
      if (estado === "ANULADO") expect(r).toBeNull();
      else {
        expect(r, estado).not.toBeNull();
        expect(r?.mensaje.length).toBeGreaterThan(0);
        expect(r?.accion.ariaLabel).toBe(`${r?.accion.label} (Bodega Ficticia)`);
      }
    }
  });

  it("borrador incompleto: Continuar al asistente", () => {
    const r = paso(exp({ estado: "BORRADOR", numero: null }));
    expect(r).toMatchObject({
      mensaje: "Tu solicitud aún no está terminada. Complétala para poder enviarla.",
      urgencia: 0,
      accion: { label: "Continuar", href: "/mi-cuenta/nueva-solicitud?borrador=e1" },
    });
  });

  it("borrador completo: Pagar con el mismo destino", () => {
    const r = paso(exp({ estado: "BORRADOR", pagoPendiente: true }));
    expect(r).toMatchObject({
      mensaje: "Tu solicitud está completa. Falta pagar la tasa para enviarla.",
      urgencia: 0,
      accion: { label: "Pagar", href: "/mi-cuenta/nueva-solicitud?borrador=e1", ariaLabel: "Pagar (Bodega Ficticia)" },
    });
  });

  it.each([
    ["PRESENTADO", "Recibimos tu solicitud. En breve la revisaremos."],
    ["EN_REVISION", "Estamos revisando tus documentos. No tienes que hacer nada por ahora."],
    ["ENVIADO_JEFATURA", "Tu solicitud pasó a Jefatura para su aprobación. No tienes que hacer nada por ahora."],
    ["APROBADO_JEFATURA", "Jefatura aprobó tu solicitud. Falta designar al inspector."],
    [
      "INSPECTOR_DESIGNADO",
      "Ya hay inspector designado. Te llamará al teléfono que registraste en tu solicitud para coordinar la visita. Mantente atento.",
    ],
    ["CUMPLE", "La inspección salió favorable. Estamos preparando tu certificado."],
    ["CERTIFICADO_PENDIENTE_FIRMA", "Tu certificado espera la aprobación de Jefatura."],
    [
      "NO_CUMPLE",
      "La inspección no salió favorable, por lo que no se emite certificado. Jefatura preparará la resolución.",
    ],
    ["EN_TRAMITE_EXTERNO", "Tu trámite sigue en proceso en la municipalidad. No tienes que hacer nada por ahora."],
    ["PENDIENTE_RESOLUCION", "Tu trámite sigue en proceso en la municipalidad. No tienes que hacer nada por ahora."],
    ["DERIVADO_COMERCIALIZACION", "Tu trámite sigue en proceso en la municipalidad. No tienes que hacer nada por ahora."],
  ] as const)("%s: espera con Ver detalle", (estado, mensaje) => {
    expect(paso(exp({ estado }))).toMatchObject({
      mensaje,
      urgencia: 1,
      accion: { label: "Ver detalle", href: "/mi-cuenta/expedientes/e1", ariaLabel: "Ver detalle (Bodega Ficticia)" },
    });
  });

  it("OBSERVADO_REQUISITOS con motivo", () => {
    const r = paso(exp({ estado: "OBSERVADO_REQUISITOS" }), ctx({ motivo: "Falta el plano" }));
    expect(r).toMatchObject({
      mensaje: "Tu solicitud tiene observaciones. Corrígelas para que continúe el trámite.",
      motivo: "Falta el plano",
      urgencia: 0,
      accion: { label: "Subsanar", href: "/mi-cuenta/expedientes/e1" },
    });
  });

  it("OBSERVADO_REQUISITOS sin motivo no trae la clave motivo", () => {
    const r = paso(exp({ estado: "OBSERVADO_REQUISITOS" }));
    expect(r).not.toBeNull();
    expect(r).not.toHaveProperty("motivo");
  });

  describe("DILIGENCIA_PROGRAMADA", () => {
    const base = exp({ estado: "DILIGENCIA_PROGRAMADA", diligenciaProgramadaPara: limaMediodia("2026-10-20") });
    it("con fecha y dirección", () => {
      expect(paso(base, ctx({ direccion: "Av. Ficticia 123" }))?.mensaje).toBe(
        "Tu inspección está programada para el 20/10/2026 en Av. Ficticia 123. El inspector te llamará al teléfono que registraste en tu solicitud. Mantente atento.",
      );
    });
    it("sin fecha ni dirección omite esas partes", () => {
      expect(paso(exp({ estado: "DILIGENCIA_PROGRAMADA" }))?.mensaje).toBe(
        "Tu inspección está programada. El inspector te llamará al teléfono que registraste en tu solicitud. Mantente atento.",
      );
    });
    it("solo fecha", () => {
      expect(paso(base)?.mensaje).toContain("programada para el 20/10/2026.");
    });
  });

  describe("EN_SUBSANACION", () => {
    const sub = (p: Partial<ExpedienteListItem>) => exp({ estado: "EN_SUBSANACION", nivelRiesgo: "BAJO", ...p });

    it("posterior vigente: subir evidencia con días hábiles", () => {
      const r = paso(sub({ subsanacionLimite: limaMediodia("2026-10-19") }));
      expect(r).toMatchObject({
        mensaje:
          "Debes corregir las observaciones y subir tu evidencia hasta el 19/10/2026. Quedan 3 días hábiles.",
        urgencia: 0,
        accion: { label: "Subir evidencia", href: "/mi-cuenta/expedientes/e1" },
      });
    });

    it("posterior vigente el último día: Vence hoy", () => {
      const r = paso(sub({ subsanacionLimite: limaMediodia("2026-10-14") }));
      expect(r?.mensaje).toBe(
        "Debes corregir las observaciones y subir tu evidencia hasta el 14/10/2026. Vence hoy.",
      );
    });

    it("posterior ya presentada", () => {
      const r = paso(
        sub({ subsanacionLimite: limaMediodia("2026-10-19"), subsanacionPresentadaAt: limaMediodia("2026-10-13") }),
      );
      expect(r).toMatchObject({
        mensaje: "Enviaste tu evidencia el 13/10/2026. La estamos evaluando.",
        urgencia: 1,
        accion: { label: "Ver detalle" },
      });
    });

    it("posterior con plazo vencido", () => {
      const r = paso(sub({ subsanacionLimite: limaMediodia("2026-10-10") }));
      expect(r).toMatchObject({
        mensaje:
          "El plazo para subsanar venció el 10/10/2026. Ya no puedes subir archivos; el personal registrará el resultado.",
        urgencia: 1,
      });
    });

    it("posterior sin límite se trata como vencido", () => {
      const r = paso(sub({ subsanacionLimite: null }));
      expect(r?.mensaje).toBe(
        "El plazo para subsanar venció. Ya no puedes subir archivos; el personal registrará el resultado.",
      );
      expect(r?.urgencia).toBe(1);
    });

    it("previa con inspección reprogramada", () => {
      const r = paso(
        sub({
          nivelRiesgo: "ALTO",
          subsanacionLimite: limaMediodia("2026-10-30"),
          diligenciaProgramadaPara: limaMediodia("2026-10-27"),
        }),
      );
      expect(r).toMatchObject({
        mensaje:
          "Tienes hasta el 30/10/2026 para corregir las observaciones. La inspección se reprogramó para el 27/10/2026. Los inspectores volverán: no necesitas subir archivos.",
        urgencia: 1,
      });
    });

    it("previa sin reprogramación", () => {
      const r = paso(sub({ nivelRiesgo: "MUY_ALTO", subsanacionLimite: limaMediodia("2026-10-30") }));
      expect(r?.mensaje).toBe(
        "Tienes hasta el 30/10/2026 para corregir las observaciones. La inspección se reprogramará. Los inspectores volverán: no necesitas subir archivos.",
      );
    });

    it("sin nivel de riesgo (dato anómalo)", () => {
      expect(paso(sub({ nivelRiesgo: null }))).toMatchObject({
        mensaje: "Tu inspección tiene observaciones por corregir.",
        urgencia: 1,
      });
    });
  });

  describe("FINALIZADO y ENTREGADO", () => {
    it("FINALIZADO con certificado", () => {
      expect(paso(exp({ estado: "FINALIZADO" }))).toMatchObject({
        mensaje: "Jefatura aprobó tu certificado. Pronto te lo enviaremos para que lo descargues.",
        urgencia: 1,
        noCumple: false,
      });
    });
    it("FINALIZADO con resolución de no cumple", () => {
      expect(paso(exp({ estado: "FINALIZADO", resolucionNoCumpleNumero: "RES-1" }))).toMatchObject({
        mensaje: "Jefatura emitió la resolución de tu trámite. Pronto te la enviaremos.",
        noCumple: true,
      });
    });
    it("ENTREGADO con certificado", () => {
      expect(paso(exp({ estado: "ENTREGADO" }))).toMatchObject({
        mensaje: "Tu certificado y tu resolución están listos para descargar.",
        urgencia: 2,
        accion: { label: "Ir a Mis certificados", href: "/mi-cuenta/certificados" },
      });
    });
    it("ENTREGADO con resolución de no cumple", () => {
      expect(paso(exp({ estado: "ENTREGADO", resolucionNoCumpleNumero: "RES-1" }))).toMatchObject({
        mensaje: "Tu resolución está lista para descargar. No se emitió certificado.",
        urgencia: 2,
      });
    });
  });
});

describe("ordenarPasos", () => {
  it("ordena por urgencia y conserva el orden a igual urgencia", () => {
    const mk = (id: string, urgencia: 0 | 1 | 2) => ({ expedienteId: id, urgencia }) as never;
    const r = ordenarPasos([mk("a", 2), mk("b", 1), mk("c", 0), mk("d", 1), mk("e", 0)]);
    expect(r.map((p) => p.expedienteId)).toEqual(["c", "e", "b", "d", "a"]);
  });
});
