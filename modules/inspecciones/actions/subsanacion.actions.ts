"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { evaluacionSubsanacionSchema } from "@/modules/inspecciones/schemas/subsanacion.schema";
import {
  evaluarSubsanacion,
  presentarSubsanacion,
  type SubsanacionResultado,
} from "@/modules/inspecciones/services/subsanacion.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

const MENSAJES = {
  no_encontrado: "No se encontró el expediente.",
  no_permitido: "Esa acción no está disponible para este expediente.",
  vencido: "El plazo para subsanar venció.",
  incompleto: "Sube la declaración jurada y el panel fotográfico antes de presentar.",
  sin_evidencia: "El solicitante aún no presentó la subsanación.",
  plazo_vencido: 'El plazo venció: solo puedes registrar "Cumple" o "No cumple".',
  motivo_requerido: "No se pudo guardar el cambio. Inténtalo de nuevo.",
  conflicto: "El expediente cambió de estado. Actualiza la página e inténtalo de nuevo.",
  error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
} as const;

async function ejecutar(
  id: string,
  llamar: () => Promise<SubsanacionResultado>,
): Promise<ActionResult<null>> {
  let res: SubsanacionResultado;
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

export async function presentarSubsanacionAction(id: string): Promise<ActionResult<null>> {
  const usuario = await requireRole("cliente");
  if (!z.uuid().safeParse(id).success) return { ok: false, error: MENSAJES.no_encontrado };
  return ejecutar(id, () => presentarSubsanacion(usuario, id));
}

export async function evaluarSubsanacionAction(
  id: string,
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const usuario = await requireRole("admin", "superadmin");
  if (!z.uuid().safeParse(id).success) return { ok: false, error: MENSAJES.no_encontrado };
  const parsed = evaluacionSubsanacionSchema.safeParse({
    resultado: formData.get("resultado") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  return ejecutar(id, () => evaluarSubsanacion(usuario, id, parsed.data));
}
