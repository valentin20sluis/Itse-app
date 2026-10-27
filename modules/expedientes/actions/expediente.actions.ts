"use server";

import { z } from "zod";
import { tipoDocumentoEnum } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { deleteUploadedFile } from "@/lib/uploadthing-server";
import {
  paso1Schema,
  paso2Schema,
  paso3Schema,
  type Paso1Input,
} from "@/modules/expedientes/schemas/solicitud.schema";
import { removeDocumento } from "@/modules/expedientes/services/documento.service";
import {
  createBorrador,
  updateBorrador,
  type PatchBorrador,
} from "@/modules/expedientes/services/expediente.service";
import type { Expediente, TipoDocumento } from "@/modules/expedientes/types/expediente.types";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

const NO_SOLICITUD = "No se encontró la solicitud.";
const NO_ESTABLECIMIENTO = "No se encontró el establecimiento.";
const ERROR_GENERICO = "No se pudo completar la operación. Inténtalo de nuevo.";

const idSchema = z.uuid();

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
        tipoTramite: formData.get("tipoTramite"),
      });
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
    default:
      return null;
  }
}

export async function saveBorradorAction(
  paso: 1 | 2 | 3,
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

const NO_DOCUMENTO = "No se encontró el documento.";

export async function removeDocumentoAction(
  expedienteId: string,
  tipo: TipoDocumento,
): Promise<ActionResult<{ id: string }>> {
  const usuario = await requireRole("cliente");
  if (
    !idSchema.safeParse(expedienteId).success ||
    !z.enum(tipoDocumentoEnum.enumValues).safeParse(tipo).success
  ) {
    return { ok: false, error: NO_DOCUMENTO };
  }
  try {
    const removed = await removeDocumento(usuario, expedienteId, tipo);
    if (!removed) return { ok: false, error: NO_DOCUMENTO };
    await deleteUploadedFile(removed.fileKey);
    return { ok: true, data: { id: removed.id } };
  } catch {
    return { ok: false, error: ERROR_GENERICO };
  }
}
