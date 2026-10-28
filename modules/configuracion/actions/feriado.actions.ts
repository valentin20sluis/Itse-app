"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { feriadoFechaSchema, feriadoSchema } from "@/modules/configuracion/schemas/feriado.schema";
import {
  crearFeriado,
  editarFeriado,
  eliminarFeriado,
  type FeriadoItem,
  type FeriadoResult,
} from "@/modules/configuracion/services/feriado-gestion.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

const RUTA = "/panel/configuracion/feriados";
const ERROR_GENERICO = "No se pudo guardar el cambio. Inténtalo de nuevo.";
const ERROR_CAMPOS = "Revisa los campos marcados.";
const NO_ENCONTRADO = "No se encontró el feriado.";

async function ejecutar(operacion: () => Promise<FeriadoResult>): Promise<ActionResult<FeriadoItem>> {
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

export async function crearFeriadoAction(formData: FormData): Promise<ActionResult<FeriadoItem>> {
  const actor = await requireRole("superadmin");
  const parsed = feriadoSchema.safeParse({ fecha: formData.get("fecha"), nombre: formData.get("nombre") });
  if (!parsed.success) return errorDeCampos(parsed.error);
  return ejecutar(() => crearFeriado(actor, parsed.data));
}

export async function editarFeriadoAction(fecha: string, formData: FormData): Promise<ActionResult<FeriadoItem>> {
  const actor = await requireRole("superadmin");
  if (!feriadoFechaSchema.safeParse(fecha).success) return { ok: false, error: NO_ENCONTRADO };
  const parsed = feriadoSchema.pick({ nombre: true }).safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) return errorDeCampos(parsed.error);
  return ejecutar(() => editarFeriado(actor, fecha, parsed.data.nombre));
}

export async function eliminarFeriadoAction(fecha: string): Promise<ActionResult<FeriadoItem>> {
  const actor = await requireRole("superadmin");
  if (!feriadoFechaSchema.safeParse(fecha).success) return { ok: false, error: NO_ENCONTRADO };
  return ejecutar(() => eliminarFeriado(actor, fecha));
}
