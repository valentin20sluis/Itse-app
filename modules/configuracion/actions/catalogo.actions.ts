"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { observacionIdSchema, observacionSchema } from "@/modules/configuracion/schemas/observacion.schema";
import {
  crearObservacion,
  editarObservacion,
  setObservacionActiva,
  type ObservacionResult,
} from "@/modules/configuracion/services/catalogo-gestion.service";
import type { ObservacionItem } from "@/modules/configuracion/types/configuracion.types";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

const RUTA = "/panel/configuracion/catalogo";
const ERROR_GENERICO = "No se pudo guardar el cambio. Inténtalo de nuevo.";
const ERROR_CAMPOS = "Revisa los campos marcados.";
const NO_ENCONTRADO = "No se encontró la observación.";

async function ejecutar(operacion: () => Promise<ObservacionResult>): Promise<ActionResult<ObservacionItem>> {
  try {
    const r = await operacion();
    if (r.ok) revalidatePath(RUTA);
    return r;
  } catch {
    return { ok: false, error: ERROR_GENERICO };
  }
}

function errorDeCampos(error: z.ZodError): ActionResult<never> {
  return {
    ok: false,
    error: ERROR_CAMPOS,
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}

export async function crearObservacionAction(formData: FormData): Promise<ActionResult<ObservacionItem>> {
  const actor = await requireRole("superadmin");
  const parsed = observacionSchema.safeParse({ descripcion: formData.get("descripcion") });
  if (!parsed.success) return errorDeCampos(parsed.error);
  return ejecutar(() => crearObservacion(actor, parsed.data.descripcion));
}

export async function editarObservacionAction(
  id: string,
  formData: FormData,
): Promise<ActionResult<ObservacionItem>> {
  const actor = await requireRole("superadmin");
  if (!observacionIdSchema.safeParse(id).success) return { ok: false, error: NO_ENCONTRADO };
  const parsed = observacionSchema.safeParse({ descripcion: formData.get("descripcion") });
  if (!parsed.success) return errorDeCampos(parsed.error);
  return ejecutar(() => editarObservacion(actor, id, parsed.data.descripcion));
}

export async function setObservacionActivaAction(
  id: string,
  activa: boolean,
): Promise<ActionResult<ObservacionItem>> {
  const actor = await requireRole("superadmin");
  if (!observacionIdSchema.safeParse(id).success) return { ok: false, error: NO_ENCONTRADO };
  if (typeof activa !== "boolean") return { ok: false, error: ERROR_GENERICO };
  return ejecutar(() => setObservacionActiva(actor, id, activa));
}
