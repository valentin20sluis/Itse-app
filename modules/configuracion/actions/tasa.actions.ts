"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { tasasSchema } from "@/modules/configuracion/schemas/tasa.schema";
import { guardarTasas } from "@/modules/configuracion/services/tasa-gestion.service";
import type { Tasas } from "@/modules/expedientes/constants/tasa";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

const ERROR_GENERICO = "No se pudo guardar el cambio. Inténtalo de nuevo.";
const ERROR_CAMPOS = "Revisa los campos marcados.";

export async function guardarTasasAction(formData: FormData): Promise<ActionResult<Tasas>> {
  const actor = await requireRole("superadmin");
  const parsed = tasasSchema.safeParse({
    posterior: formData.get("posterior"),
    previa: formData.get("previa"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: ERROR_CAMPOS,
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  try {
    const r = await guardarTasas(actor, parsed.data);
    if (r.ok) {
      revalidatePath("/panel/configuracion/tasas");
      revalidatePath("/mi-cuenta/nueva-solicitud");
    }
    return r;
  } catch {
    return { ok: false, error: ERROR_GENERICO };
  }
}
