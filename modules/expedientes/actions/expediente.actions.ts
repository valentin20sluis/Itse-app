"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import {
  declaracionSchema,
  paso1Schema,
  paso2Schema,
  paso3Schema,
  paso4Schema,
  type Paso1Input,
} from "@/modules/expedientes/schemas/solicitud.schema";
import {
  createBorrador,
  enviarExpediente,
  updateBorrador,
  type PatchBorrador,
} from "@/modules/expedientes/services/expediente.service";
import type { Expediente } from "@/modules/expedientes/types/expediente.types";
import { DOCUMENTOS } from "@/modules/expedientes/utils/documentos";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

const NO_SOLICITUD = "No se encontró la solicitud.";
const NO_ESTABLECIMIENTO = "No se encontró el establecimiento.";
const ERROR_GENERICO = "No se pudo completar la operación. Inténtalo de nuevo.";

const idSchema = z.uuid();

const NOMBRES_FALTANTE: Record<string, string> = {
  paso1: "Establecimiento y trámite",
  paso2: "Nivel de riesgo",
  paso3: "Solicitante",
  paso4: "Número de boleta",
  declaracion: "Declaración jurada",
  establecimiento: "Establecimiento",
  ...Object.fromEntries(DOCUMENTOS.map((d) => [d.tipo, d.etiqueta])),
};

function invalid(error: z.ZodError): { ok: false; error: string; fieldErrors: Record<string, string[]> } {
  return {
    ok: false,
    error: "Revisa los campos marcados.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}

function parsePaso(paso: number, formData: FormData) {
  switch (paso) {
    case 1:
      return paso1Schema.safeParse({
        establecimientoId: formData.get("establecimientoId"),
        tipoTramite: formData.get("tipoTramite"),      });
    case 2:
      return paso2Schema.safeParse({
        nivelRiesgo: formData.get("nivelRiesgo"),
        tieneSotano: formData.get("tieneSotano"),
        almacenaInflamables: formData.get("almacenaInflamables"),
        tieneCocina: formData.get("tieneCocina"),
        esGrifo: formData.get("esGrifo"),
        usoMixtoPatrimonio: formData.get("usoMixtoPatrimonio"),
        granEscala: formData.get("granEscala"),
      });
    case 3:
      return paso3Schema.safeParse({
        solicitanteNombre: formData.get("solicitanteNombre"),
        solicitanteDocumento: formData.get("solicitanteDocumento"),
        solicitanteTelefono: formData.get("solicitanteTelefono"),
        solicitanteEmail: formData.get("solicitanteEmail"),
      });
    case 4:
      return paso4Schema.safeParse({ numeroBoleta: formData.get("numeroBoleta") });
    default:
      return null;
  }
}

export async function saveBorradorAction(
  paso: 1 | 2 | 3 | 4,
  id: string | null,
  _prev: ActionResult<Expediente> | null,
  formData: FormData,
): Promise<ActionResult<Expediente>> {
  const usuario = await requireRole("cliente");
  const parsed = parsePaso(paso, formData);
  if (!parsed) return { ok: false, error: NO_SOLICITUD };
  if (id !== null && !idSchema.safeParse(id).success) return { ok: false, error: NO_SOLICITUD };
  if (id === null && paso !== 1) return { ok: false, error: NO_SOLICITUD };
  if (!parsed.success) return invalid(parsed.error);

  try {
    const data =
      id === null
        ? await createBorrador(usuario, parsed.data as Paso1Input)
        : await updateBorrador(usuario, id, parsed.data as PatchBorrador);
    if (!data) return { ok: false, error: id === null ? NO_ESTABLECIMIENTO : NO_SOLICITUD };
    return { ok: true, data };
  } catch {
    return { ok: false, error: ERROR_GENERICO };
  }
}

export async function enviarSolicitudAction(
  id: string,
  _prev: ActionResult<{ id: string; numero: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string; numero: string }>> {
  const usuario = await requireRole("cliente");
  if (!idSchema.safeParse(id).success) return { ok: false, error: NO_SOLICITUD };
  const parsed = declaracionSchema.safeParse({ aceptada: formData.get("aceptada") });
  if (!parsed.success) return invalid(parsed.error);

  try {
    const res = await enviarExpediente(usuario, id, parsed.data.aceptada);
    if (res.status === "no_encontrado") return { ok: false, error: NO_SOLICITUD };
    if (res.status === "incompleto") {
      const lista = res.faltantes.map((f) => NOMBRES_FALTANTE[f] ?? f).join(", ");
      return { ok: false, error: `Aún falta completar: ${lista}.` };
    }
    revalidatePath("/mi-cuenta/expedientes");
    return { ok: true, data: { id: res.expediente.id, numero: res.expediente.numero ?? "" } };
  } catch {
    return { ok: false, error: ERROR_GENERICO };
  }
}
