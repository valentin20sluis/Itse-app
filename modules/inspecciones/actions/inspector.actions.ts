"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Inspector } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { inspectorSchema } from "@/modules/inspecciones/schemas/inspector.schema";
import {
  createInspector,
  InspectorDuplicadoError,
  setInspectorActivo,
  updateInspector,
} from "@/modules/inspecciones/services/inspector.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

const PATH = "/panel/inspectores";
const NO_ENCONTRADO = "No se encontró el inspector.";
const DUPLICADO = "Ya existe un inspector con ese documento.";
const ERROR_GENERICO = "No se pudo guardar el cambio. Inténtalo de nuevo.";

const idSchema = z.uuid();

function parseForm(formData: FormData) {
  return inspectorSchema.safeParse({
    nombres: formData.get("nombres"),
    apellidos: formData.get("apellidos"),
    documento: formData.get("documento"),
    telefono: formData.get("telefono"),
    email: formData.get("email"),
    profesion: formData.get("profesion"),
  });
}

function invalid(error: z.ZodError): ActionResult<never> {
  return {
    ok: false,
    error: "Revisa los campos marcados.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}

async function run(operation: () => Promise<Inspector | null>): Promise<ActionResult<Inspector>> {
  try {
    const data = await operation();
    if (!data) return { ok: false, error: NO_ENCONTRADO };
    revalidatePath(PATH);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof InspectorDuplicadoError) return { ok: false, error: DUPLICADO };
    return { ok: false, error: ERROR_GENERICO };
  }
}

export async function crearInspectorAction(
  _prev: ActionResult<Inspector> | null,
  formData: FormData,
): Promise<ActionResult<Inspector>> {
  const usuario = await requireRole("admin", "superadmin");
  const parsed = parseForm(formData);
  if (!parsed.success) return invalid(parsed.error);
  return run(() => createInspector(usuario, parsed.data));
}

export async function editarInspectorAction(
  id: string,
  _prev: ActionResult<Inspector> | null,
  formData: FormData,
): Promise<ActionResult<Inspector>> {
  const usuario = await requireRole("admin", "superadmin");
  if (!idSchema.safeParse(id).success) return { ok: false, error: NO_ENCONTRADO };
  const parsed = parseForm(formData);
  if (!parsed.success) return invalid(parsed.error);
  return run(() => updateInspector(usuario, id, parsed.data));
}

export async function setInspectorActivoAction(
  id: string,
  activo: boolean,
): Promise<ActionResult<Inspector>> {
  const usuario = await requireRole("admin", "superadmin");
  if (!idSchema.safeParse(id).success) return { ok: false, error: NO_ENCONTRADO };
  return run(() => setInspectorActivo(usuario, id, activo === true));
}
