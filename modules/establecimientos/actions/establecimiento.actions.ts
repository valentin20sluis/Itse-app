"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { establecimientoSchema } from "@/modules/establecimientos/schemas/establecimiento.schema";
import {
  archiveEstablecimiento,
  createEstablecimiento,
  EstablecimientoConExpedientesError,
  updateEstablecimiento,
} from "@/modules/establecimientos/services/establecimiento.service";
import type { Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

const PATH = "/mi-cuenta/establecimientos";
const NO_ENCONTRADO = "No se encontró el establecimiento.";
const CON_EXPEDIENTES = "No puedes archivar un establecimiento con expedientes en trámite.";
const ERROR_GENERICO = "No se pudo completar la operación. Inténtalo de nuevo.";

const idSchema = z.uuid();

function parseForm(formData: FormData) {
  return establecimientoSchema.safeParse({
    nombreComercial: formData.get("nombreComercial"),
    direccion: formData.get("direccion"),
    distrito: formData.get("distrito"),
    numeroGiro: formData.get("numeroGiro"),
    funcion: formData.get("funcion"),
    giro: formData.get("giro"),
    areaM2: formData.get("areaM2"),
    numeroPisos: formData.get("numeroPisos"),
    pisoEstablecimiento: formData.get("pisoEstablecimiento"),
  });
}

async function run<T>(operation: () => Promise<T | null>): Promise<ActionResult<T>> {
  try {
    const data = await operation();
    if (!data) return { ok: false, error: NO_ENCONTRADO };
    revalidatePath(PATH);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof EstablecimientoConExpedientesError) return { ok: false, error: CON_EXPEDIENTES };
    return { ok: false, error: ERROR_GENERICO };
  }
}

export async function createEstablecimientoAction(
  _prev: ActionResult<Establecimiento> | null,
  formData: FormData,
): Promise<ActionResult<Establecimiento>> {
  const usuario = await requireRole("cliente");
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  return run(() => createEstablecimiento(usuario, parsed.data));
}

export async function updateEstablecimientoAction(
  id: string,
  _prev: ActionResult<Establecimiento> | null,
  formData: FormData,
): Promise<ActionResult<Establecimiento>> {
  const usuario = await requireRole("cliente");
  if (!idSchema.safeParse(id).success) return { ok: false, error: NO_ENCONTRADO };
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  return run(() => updateEstablecimiento(usuario, id, parsed.data));
}

export async function archiveEstablecimientoAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const usuario = await requireRole("cliente");
  if (!idSchema.safeParse(id).success) return { ok: false, error: NO_ENCONTRADO };
  return run(async () => {
    const row = await archiveEstablecimiento(usuario, id);
    return row ? { id: row.id } : null;
  });
}
