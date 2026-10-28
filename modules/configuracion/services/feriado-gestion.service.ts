import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { feriados } from "@/db/schema";
import {
  assertSuperadmin,
  auditoriaFila,
} from "@/modules/configuracion/services/auditoria-configuracion.service";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";

export type FeriadoItem = { fecha: string; nombre: string };
export type FeriadoResult = { ok: true; data: FeriadoItem } | { ok: false; error: string };

const DUPLICADO = "Ya existe un feriado en esa fecha.";
const NO_ENCONTRADO = "No se encontró el feriado.";
const SIN_CAMBIOS = "No hay cambios que guardar.";
const ERROR_GENERICO = "No se pudo guardar el cambio. Inténtalo de nuevo.";

function esClaveDuplicada(e: unknown): boolean {
  const c = e as { code?: string; cause?: { code?: string } } | null;
  return c?.code === "23505" || c?.cause?.code === "23505";
}

async function leerNombre(fecha: string): Promise<string | null> {
  const [f] = await db
    .select({ nombre: feriados.nombre })
    .from(feriados)
    .where(eq(feriados.fecha, fecha))
    .limit(1);
  return f?.nombre ?? null;
}

export async function listFeriados(actor: Actor): Promise<FeriadoItem[]> {
  assertSuperadmin(actor);
  return db.select({ fecha: feriados.fecha, nombre: feriados.nombre }).from(feriados).orderBy(asc(feriados.fecha));
}

export async function crearFeriado(actor: Actor, input: FeriadoItem): Promise<FeriadoResult> {
  assertSuperadmin(actor);
  if ((await leerNombre(input.fecha)) !== null) return { ok: false, error: DUPLICADO };
  try {
    await db.batch([
      db.insert(feriados).values(input),
      auditoriaFila({
        actorId: actor.id,
        entidad: "FERIADO",
        accion: "CREAR",
        referencia: input.fecha,
        valorAnterior: null,
        valorNuevo: input.nombre,
      }),
    ]);
  } catch (e) {
    return { ok: false, error: esClaveDuplicada(e) ? DUPLICADO : ERROR_GENERICO };
  }
  return { ok: true, data: input };
}

export async function editarFeriado(actor: Actor, fecha: string, nombre: string): Promise<FeriadoResult> {
  assertSuperadmin(actor);
  const anterior = await leerNombre(fecha);
  if (anterior === null) return { ok: false, error: NO_ENCONTRADO };
  if (anterior === nombre) return { ok: false, error: SIN_CAMBIOS };
  try {
    await db.batch([
      db.update(feriados).set({ nombre, updatedAt: new Date() }).where(eq(feriados.fecha, fecha)),
      auditoriaFila({
        actorId: actor.id,
        entidad: "FERIADO",
        accion: "EDITAR",
        referencia: fecha,
        valorAnterior: anterior,
        valorNuevo: nombre,
      }),
    ]);
  } catch {
    return { ok: false, error: ERROR_GENERICO };
  }
  return { ok: true, data: { fecha, nombre } };
}

export async function eliminarFeriado(actor: Actor, fecha: string): Promise<FeriadoResult> {
  assertSuperadmin(actor);
  const anterior = await leerNombre(fecha);
  if (anterior === null) return { ok: false, error: NO_ENCONTRADO };
  try {
    await db.batch([
      db.delete(feriados).where(eq(feriados.fecha, fecha)),
      auditoriaFila({
        actorId: actor.id,
        entidad: "FERIADO",
        accion: "ELIMINAR",
        referencia: fecha,
        valorAnterior: anterior,
        valorNuevo: null,
      }),
    ]);
  } catch {
    return { ok: false, error: ERROR_GENERICO };
  }
  return { ok: true, data: { fecha, nombre: anterior } };
}
