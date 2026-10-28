import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import type { TransicionResultado } from "@/modules/expedientes/services/transicion.service";

const MENSAJES = {
  no_encontrado: "No se encontró el expediente.",
  no_permitido: "Esa acción no está disponible para este expediente.",
  motivo_requerido: "No se pudo guardar el cambio. Inténtalo de nuevo.",
  conflicto: "El expediente cambió de estado. Actualiza la página e inténtalo de nuevo.",
  error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
} as const;

export const ID_INVALIDO: ActionResult<null> = { ok: false, error: MENSAJES.no_encontrado };

// Traduce el resultado del servicio y revalida las pantallas afectadas solo si se guardó.
export async function ejecutarCertificado(
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
  for (const ruta of [
    "/panel/expedientes",
    `/panel/expedientes/${id}`,
    "/mi-cuenta/expedientes",
    `/mi-cuenta/expedientes/${id}`,
    "/panel/certificados",
    "/mi-cuenta/certificados",
  ]) {
    revalidatePath(ruta);
  }
  return { ok: true, data: null };
}
