"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { invitarSchema } from "@/modules/usuarios/schemas/invitacion.schema";
import {
  cambiarEstadoSchema,
  cambiarRolSchema,
} from "@/modules/usuarios/schemas/usuario-gestion.schema";
import { requireRole } from "@/modules/usuarios/services/authorization.service";
import { invitarPersonal } from "@/modules/usuarios/services/invitacion.service";
import {
  cambiarRol,
  setActivo,
  type GestionResult,
} from "@/modules/usuarios/services/usuario-gestion.service";
import type { Role } from "@/modules/usuarios/types/user.types";

type Cambio = { id: string; rol: Role; activo: boolean };

const NO_ENCONTRADO = "No se encontró el usuario.";
const ERROR_VALIDACION = "Revisa los datos e inténtalo de nuevo.";
const ERROR_GENERICO = "No se pudo guardar el cambio. Inténtalo de nuevo.";

async function ejecutar(id: string, operacion: () => Promise<GestionResult>): Promise<ActionResult<Cambio>> {
  try {
    const r = await operacion();
    if (!r.ok) return r;
    revalidatePath("/panel/usuarios");
    revalidatePath(`/panel/usuarios/${id}`);
    return r;
  } catch {
    return { ok: false, error: ERROR_GENERICO };
  }
}

export async function cambiarRolAction(id: string, rol: string): Promise<ActionResult<Cambio>> {
  const actor = await requireRole("superadmin");
  const parsed = cambiarRolSchema.safeParse({ id, rol });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.some((i) => i.path[0] === "id") ? NO_ENCONTRADO : ERROR_VALIDACION };
  }
  return ejecutar(id, () => cambiarRol(actor, parsed.data.id, parsed.data.rol));
}

export async function setUsuarioActivoAction(id: string, activo: boolean): Promise<ActionResult<Cambio>> {
  const actor = await requireRole("superadmin");
  const parsed = cambiarEstadoSchema.safeParse({ id, activo });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.some((i) => i.path[0] === "id") ? NO_ENCONTRADO : ERROR_VALIDACION };
  }
  return ejecutar(id, () => setActivo(actor, parsed.data.id, parsed.data.activo));
}

export async function invitarPersonalAction(
  _prev: ActionResult<{ email: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ email: string }>> {
  const actor = await requireRole("superadmin");
  const parsed = invitarSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  try {
    return await invitarPersonal(actor, parsed.data.email);
  } catch {
    return { ok: false, error: "No se pudo enviar la invitación. Inténtalo de nuevo." };
  }
}
