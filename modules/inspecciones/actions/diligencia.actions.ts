"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import {
  programacionSchema,
  resultadoDiligenciaSchema,
} from "@/modules/inspecciones/schemas/diligencia.schema";
import {
  programarDiligencia,
  registrarResultadoDiligencia,
  type DiligenciaResultado,
} from "@/modules/inspecciones/services/diligencia.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

const MENSAJES = {
  no_encontrado: "No se encontró el expediente.",
  no_permitido: "Esa acción no está disponible para este expediente.",
  fecha_invalida: "Elige una fecha desde hoy, dentro de los próximos 90 días.",
  motivo_requerido: "Escribe un informe de al menos 10 caracteres.",
  conflicto: "El expediente cambió de estado. Actualiza la página e inténtalo de nuevo.",
  error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
} as const;

function invalido(error: z.ZodError): ActionResult<null> {
  return {
    ok: false,
    error: "Revisa los campos marcados.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}

async function ejecutar(
  id: string,
  llamar: () => Promise<DiligenciaResultado>,
): Promise<ActionResult<null>> {
  let res: DiligenciaResultado;
  try {
    res = await llamar();
  } catch {
    return { ok: false, error: MENSAJES.error };
  }
  if (res.status !== "ok") return { ok: false, error: MENSAJES[res.status] };
  revalidatePath("/panel/expedientes");
  revalidatePath(`/panel/expedientes/${id}`);
  revalidatePath("/mi-cuenta/expedientes");
  revalidatePath(`/mi-cuenta/expedientes/${id}`);
  return { ok: true, data: null };
}

export async function programarDiligenciaAction(
  id: string,
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const usuario = await requireRole("admin", "superadmin");
  if (!z.uuid().safeParse(id).success) return { ok: false, error: MENSAJES.no_encontrado };
  const parsed = programacionSchema.safeParse({ programadaPara: formData.get("programadaPara") ?? "" });
  if (!parsed.success) return invalido(parsed.error);
  return ejecutar(id, () => programarDiligencia(usuario, id, parsed.data.programadaPara));
}

export async function registrarResultadoAction(
  id: string,
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const usuario = await requireRole("admin", "superadmin");
  if (!z.uuid().safeParse(id).success) return { ok: false, error: MENSAJES.no_encontrado };
  const parsed = resultadoDiligenciaSchema.safeParse({
    resultado: formData.get("resultado") ?? "",
    informe: formData.get("informe") ?? "",
  });
  if (!parsed.success) return invalido(parsed.error);
  return ejecutar(id, () => registrarResultadoDiligencia(usuario, id, parsed.data));
}
