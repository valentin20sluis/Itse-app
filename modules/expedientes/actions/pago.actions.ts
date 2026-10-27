"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { declaracionSchema } from "@/modules/expedientes/schemas/solicitud.schema";
import { prepararPago } from "@/modules/expedientes/services/expediente.service";
import { crearSesionPago } from "@/modules/expedientes/services/pago.service";
import { NOMBRES_FALTANTE } from "@/modules/expedientes/utils/nombres-faltante";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

const NO_SOLICITUD = "No se encontró la solicitud.";
const ERROR_PAGO = "No se pudo iniciar el pago. Inténtalo de nuevo.";

export async function iniciarPagoAction(
  id: string,
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const usuario = await requireRole("cliente");
  if (!z.uuid().safeParse(id).success) return { ok: false, error: NO_SOLICITUD };
  const declaracion = declaracionSchema.safeParse({ aceptada: formData.get("aceptada") });
  if (!declaracion.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(declaracion.error).fieldErrors as Record<string, string[]>,
    };
  }

  let url: string;
  try {
    const prep = await prepararPago(usuario, id, declaracion.data.aceptada);
    if (prep.status === "no_encontrado") return { ok: false, error: NO_SOLICITUD };
    if (prep.status === "incompleto") {
      const lista = prep.faltantes.map((f) => NOMBRES_FALTANTE[f] ?? f).join(", ");
      return { ok: false, error: `Aún falta completar: ${lista}.` };
    }
    const sesion = await crearSesionPago(usuario, prep.expediente);
    if (sesion.status === "no_encontrado") return { ok: false, error: NO_SOLICITUD };
    url = sesion.url;
  } catch {
    return { ok: false, error: ERROR_PAGO };
  }
  revalidatePath("/mi-cuenta/expedientes");
  redirect(url);
}
