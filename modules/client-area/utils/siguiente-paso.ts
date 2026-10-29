import type { PasoSiguiente } from "@/modules/client-area/types/inicio.types";
import type { EstadoExpediente } from "@/modules/expedientes/constants/estado-labels";
import type { ExpedienteListItem } from "@/modules/expedientes/types/expediente.types";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";
import { tipoItsePorRiesgo } from "@/modules/expedientes/utils/riesgo";
import { estadoPlazo } from "@/modules/inspecciones/utils/dias-habiles";
import { puedeSubirEvidencia } from "@/modules/inspecciones/utils/subsanacion";
import { textoDiasRestantes } from "@/modules/inspecciones/utils/texto-plazo";

type Contexto = {
  motivo: string | null;
  direccion: string | null;
  feriados: readonly string[];
  ahora: Date;
};

type Resultado = Pick<PasoSiguiente, "mensaje" | "urgencia"> & {
  accion: "detalle" | "borrador" | "pagar" | "subsanar" | "evidencia" | "certificados";
  motivo?: string;
};

const ESPERA = "No tienes que hacer nada por ahora.";
const LLAMADA = "El inspector te llamará al teléfono que registraste en tu solicitud.";

const detalle = (mensaje: string): Resultado => ({ mensaje, urgencia: 1, accion: "detalle" });

function enSubsanacion(e: ExpedienteListItem, ctx: Contexto): Resultado {
  if (!e.nivelRiesgo) return detalle("Tu inspección tiene observaciones por corregir.");

  const tipoItse = tipoItsePorRiesgo(e.nivelRiesgo);
  const limite = e.subsanacionLimite;
  const plazo = limite ? estadoPlazo(limite, ctx.ahora, ctx.feriados) : null;
  // Sin límite se trata como vencido, igual que el detalle del expediente.
  const vencido = plazo?.vencido ?? true;
  const presentada = e.subsanacionPresentadaAt !== null;

  if (tipoItse === "PREVIA") {
    const reprogramacion = e.diligenciaProgramadaPara
      ? `La inspección se reprogramó para el ${formatFecha(e.diligenciaProgramadaPara)}.`
      : "La inspección se reprogramará.";
    const hasta = limite ? `Tienes hasta el ${formatFecha(limite)}` : "Tienes un plazo";
    return detalle(
      `${hasta} para corregir las observaciones. ${reprogramacion} Los inspectores volverán: no necesitas subir archivos.`,
    );
  }
  if (presentada) {
    return detalle(`Enviaste tu evidencia el ${formatFecha(e.subsanacionPresentadaAt as Date)}. La estamos evaluando.`);
  }
  if (limite && plazo && puedeSubirEvidencia({ tipoItse, presentada, vencido })) {
    return {
      mensaje: `Debes corregir las observaciones y subir tu evidencia hasta el ${formatFecha(limite)}. ${textoDiasRestantes(plazo.diasRestantes)}.`,
      urgencia: 0,
      accion: "evidencia",
    };
  }
  const cuando = limite ? `venció el ${formatFecha(limite)}` : "venció";
  return detalle(
    `El plazo para subsanar ${cuando}. Ya no puedes subir archivos; el personal registrará el resultado.`,
  );
}

function resolver(e: ExpedienteListItem, ctx: Contexto): Resultado | null {
  const noCumple = e.resolucionNoCumpleNumero !== null;
  const estado: EstadoExpediente = e.estado;

  switch (estado) {
    case "BORRADOR":
      return e.pagoPendiente
        ? { mensaje: "Tu solicitud está completa. Falta pagar la tasa para enviarla.", urgencia: 0, accion: "pagar" }
        : { mensaje: "Tu solicitud aún no está terminada. Complétala para poder enviarla.", urgencia: 0, accion: "borrador" };
    case "PRESENTADO":
      return detalle("Recibimos tu solicitud. En breve la revisaremos.");
    case "EN_REVISION":
      return detalle(`Estamos revisando tus documentos. ${ESPERA}`);
    case "OBSERVADO_REQUISITOS":
      return {
        mensaje: "Tu solicitud tiene observaciones. Corrígelas para que continúe el trámite.",
        motivo: ctx.motivo ?? undefined,
        urgencia: 0,
        accion: "subsanar",
      };
    case "ENVIADO_JEFATURA":
      return detalle(`Tu solicitud pasó a Jefatura para su aprobación. ${ESPERA}`);
    case "APROBADO_JEFATURA":
      return detalle("Jefatura aprobó tu solicitud. Falta designar al inspector.");
    case "INSPECTOR_DESIGNADO":
      return detalle(
        "Ya hay inspector designado. Te llamará al teléfono que registraste en tu solicitud para coordinar la visita. Mantente atento.",
      );
    case "DILIGENCIA_PROGRAMADA": {
      const fecha = e.diligenciaProgramadaPara ? ` para el ${formatFecha(e.diligenciaProgramadaPara)}` : "";
      const lugar = ctx.direccion ? ` en ${ctx.direccion}` : "";
      return detalle(`Tu inspección está programada${fecha}${lugar}. ${LLAMADA} Mantente atento.`);
    }
    case "EN_SUBSANACION":
      return enSubsanacion(e, ctx);
    case "CUMPLE":
      return detalle("La inspección salió favorable. Estamos preparando tu certificado.");
    case "CERTIFICADO_PENDIENTE_FIRMA":
      return detalle("Tu certificado espera la aprobación de Jefatura.");
    case "FINALIZADO":
      return detalle(
        noCumple
          ? "Jefatura emitió la resolución de tu trámite. Pronto te la enviaremos."
          : "Jefatura aprobó tu certificado. Pronto te lo enviaremos para que lo descargues.",
      );
    case "NO_CUMPLE":
      return detalle(
        "La inspección no salió favorable, por lo que no se emite certificado. Jefatura preparará la resolución.",
      );
    case "ENTREGADO":
      return {
        mensaje: noCumple
          ? "Tu resolución está lista para descargar. No se emitió certificado."
          : "Tu certificado y tu resolución están listos para descargar.",
        urgencia: 2,
        accion: "certificados",
      };
    case "EN_TRAMITE_EXTERNO":
    case "PENDIENTE_RESOLUCION":
    case "DERIVADO_COMERCIALIZACION":
      return detalle(`Tu trámite sigue en proceso en la municipalidad. ${ESPERA}`);
    case "ANULADO":
      return null;
    default: {
      const exhaustivo: never = estado;
      return exhaustivo;
    }
  }
}

const ACCIONES = {
  detalle: (id: string) => ({ label: "Ver detalle", href: `/mi-cuenta/expedientes/${id}` }),
  borrador: (id: string) => ({ label: "Continuar", href: `/mi-cuenta/nueva-solicitud?borrador=${id}` }),
  pagar: (id: string) => ({ label: "Pagar", href: `/mi-cuenta/nueva-solicitud?borrador=${id}` }),
  subsanar: (id: string) => ({ label: "Subsanar", href: `/mi-cuenta/expedientes/${id}` }),
  evidencia: (id: string) => ({ label: "Subir evidencia", href: `/mi-cuenta/expedientes/${id}` }),
  certificados: () => ({ label: "Ir a Mis certificados", href: "/mi-cuenta/certificados" }),
};

export function siguientePaso(e: ExpedienteListItem, ctx: Contexto): PasoSiguiente | null {
  const r = resolver(e, ctx);
  if (!r) return null;
  const { label, href } = ACCIONES[r.accion](e.id);
  return {
    expedienteId: e.id,
    establecimientoNombre: e.establecimientoNombre,
    numero: e.numero,
    estado: e.estado,
    noCumple: e.resolucionNoCumpleNumero !== null,
    mensaje: r.mensaje,
    ...(r.motivo ? { motivo: r.motivo } : {}),
    accion: { label, href, ariaLabel: `${label} (${e.establecimientoNombre})` },
    urgencia: r.urgencia,
  };
}

// Array.prototype.sort es estable: a igual urgencia se conserva el orden recibido.
export function ordenarPasos(pasos: PasoSiguiente[]): PasoSiguiente[] {
  return [...pasos].sort((a, b) => a.urgencia - b.urgencia);
}
