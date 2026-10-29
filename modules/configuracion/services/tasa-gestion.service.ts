import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tasas } from "@/db/schema";
import {
  assertSuperadmin,
  auditoriaFila,
} from "@/modules/configuracion/services/auditoria-configuracion.service";
import { getTasas } from "@/modules/configuracion/services/tasa-lectura.service";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import type { Tasas } from "@/modules/expedientes/constants/tasa";

export type TasaResult = { ok: true; data: Tasas } | { ok: false; error: string };

const SIN_CAMBIOS = "No hay cambios que guardar.";
const ERROR_GENERICO = "No se pudo guardar el cambio. Inténtalo de nuevo.";

export async function listTasas(actor: Actor): Promise<Tasas> {
  assertSuperadmin(actor);
  return getTasas();
}

/** Solo toca `tasas` y la auditoría: nunca `expedientes`, así lo ya cobrado no cambia. */
export async function guardarTasas(
  actor: Actor,
  input: { posterior: number; previa: number },
): Promise<TasaResult> {
  assertSuperadmin(actor);
  const actuales = await getTasas();
  const nuevas: Tasas = { POSTERIOR: input.posterior, PREVIA: input.previa };
  const cambiados = (["POSTERIOR", "PREVIA"] as const).filter((t) => nuevas[t] !== actuales[t]);
  if (cambiados.length === 0) return { ok: false, error: SIN_CAMBIOS };

  try {
    await db.batch(
      cambiados.flatMap((tipo) => [
        db
          .update(tasas)
          .set({ montoCentimos: nuevas[tipo], updatedAt: new Date() })
          .where(eq(tasas.tipoItse, tipo)),
        auditoriaFila({
          actorId: actor.id,
          entidad: "TASA",
          accion: "EDITAR",
          referencia: tipo,
          valorAnterior: String(actuales[tipo]),
          valorNuevo: String(nuevas[tipo]),
        }),
      ]) as unknown as Parameters<typeof db.batch>[0],
    );
  } catch {
    return { ok: false, error: ERROR_GENERICO };
  }
  return { ok: true, data: nuevas };
}
