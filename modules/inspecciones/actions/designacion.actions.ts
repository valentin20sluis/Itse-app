"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { designacionSchema } from "@/modules/inspecciones/schemas/designacion.schema";
import {
  designarInspectores,
  type DesignacionResultado,
} from "@/modules/inspecciones/services/designacion.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

const MENSAJES = {
  no_encontrado: "No se encontró el expediente.",
  no_permitido: "Esa acción no está disponible para este expediente.",
  cantidad_invalida: "Elige la cantidad exacta de inspectores que pide el nivel de riesgo.",
  inspector_invalido: "Alguno de los inspectores ya no está disponible. Actualiza la página.",
  conflicto: "Los datos cambiaron. Actualiza la página e inténtalo de nuevo.",
  error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
} as const;

export async function designarInspectoresAction(
  expedienteId: string,
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const usuario = await requireRole("admin", "superadmin");
  if (!z.uuid().safeParse(expedienteId).success) return { ok: false, error: MENSAJES.no_encontrado };
  const parsed = designacionSchema.safeParse({ inspectorIds: formData.getAll("inspectorIds") });
  if (!parsed.success) return { ok: false, error: MENSAJES.cantidad_invalida };

  let res: DesignacionResultado;
  try {
    res = await designarInspectores(usuario, expedienteId, parsed.data.inspectorIds);
  } catch {
    return { ok: false, error: MENSAJES.error };
  }
  if (res.status !== "ok") return { ok: false, error: MENSAJES[res.status] };

  revalidatePath("/panel/expedientes");
  revalidatePath(`/panel/expedientes/${expedienteId}`);
  revalidatePath("/mi-cuenta/expedientes");
  revalidatePath(`/mi-cuenta/expedientes/${expedienteId}`);
  return { ok: true, data: null };
}
