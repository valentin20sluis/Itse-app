"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { cambioEstadoSchema, cambioRiesgoSchema } from "@/modules/expedientes/schemas/cambio-estado.schema";
import {
  actualizarRiesgo,
  cambiarEstado,
  type TransicionResultado,
} from "@/modules/expedientes/services/transicion.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

const MENSAJES = {
  no_encontrado: "No se encontró el expediente.",
  no_permitido: "Esa acción no está disponible para este expediente.",
  conflicto: "El expediente cambió de estado. Actualiza la página e inténtalo de nuevo.",
  motivo_requerido: "Escribe un motivo de al menos 10 caracteres.",
  error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
} as const;

function revalidar(id: string) {
  revalidatePath("/panel/expedientes");
  revalidatePath(`/panel/expedientes/${id}`);
  revalidatePath("/mi-cuenta/expedientes");
  revalidatePath(`/mi-cuenta/expedientes/${id}`);
}

async function ejecutar(
  id: string,
  llamar: () => Promise<TransicionResultado>,
): Promise<ActionResult<null>> {
  let res: TransicionResultado;
  try {
    res = await llamar();
  } catch {
    return { ok: false, error: MENSAJES.error };
  }
  if (res.status !== "ok") return { ok: false, error: MENSAJES[res.status] };
  revalidar(id);
  return { ok: true, data: null };
}

function invalido(error: z.ZodError): ActionResult<null> {
  return {
    ok: false,
    error: "Revisa los campos marcados.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}

export async function cambiarEstadoAction(
  id: string,
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const usuario = await requireRole("admin", "superadmin");
  if (!z.uuid().safeParse(id).success) return { ok: false, error: MENSAJES.no_encontrado };
  const parsed = cambioEstadoSchema.safeParse({
    hasta: formData.get("hasta") ?? "",
    comentario: formData.get("comentario") ?? "",
  });
  if (!parsed.success) return invalido(parsed.error);
  return ejecutar(id, () => cambiarEstado(usuario, id, parsed.data));
}

export async function actualizarRiesgoAction(
  id: string,
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const usuario = await requireRole("admin", "superadmin");
  if (!z.uuid().safeParse(id).success) return { ok: false, error: MENSAJES.no_encontrado };
  const parsed = cambioRiesgoSchema.safeParse({
    nivelRiesgo: formData.get("nivelRiesgo") ?? "",
    nota: formData.get("nota") ?? "",
  });
  if (!parsed.success) return invalido(parsed.error);
  return ejecutar(id, () => actualizarRiesgo(usuario, id, parsed.data));
}
