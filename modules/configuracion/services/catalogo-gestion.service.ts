import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { catalogoObservaciones } from "@/db/schema";
import { assertSuperadmin, auditoriaFila } from "@/modules/configuracion/services/auditoria-configuracion.service";
import type { ObservacionItem } from "@/modules/configuracion/types/configuracion.types";
import { generarCodigo, normalizarDescripcion } from "@/modules/configuracion/utils/generar-codigo";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";

export type ObservacionResult = { ok: true; data: ObservacionItem } | { ok: false; error: string };

const DUPLICADO = "Ya existe una observación con esa descripción.";
const NO_ENCONTRADO = "No se encontró la observación.";
const SIN_CAMBIOS = "No hay cambios que guardar.";
const ERROR_GENERICO = "No se pudo guardar el cambio. Inténtalo de nuevo.";
const INTENTOS = 5;

function esClaveDuplicada(e: unknown): boolean {
  const c = e as { code?: string; cause?: { code?: string } } | null;
  return c?.code === "23505" || c?.cause?.code === "23505";
}

// El catálogo es corto: una sola lectura sirve para buscar por id, detectar duplicados y generar el código.
function leerTodas() {
  return db
    .select({
      id: catalogoObservaciones.id,
      codigo: catalogoObservaciones.codigo,
      descripcion: catalogoObservaciones.descripcion,
      activo: catalogoObservaciones.activo,
    })
    .from(catalogoObservaciones)
    .orderBy(asc(catalogoObservaciones.descripcion));
}

type Fila = Awaited<ReturnType<typeof leerTodas>>[number];

const esDuplicada = (filas: Fila[], descripcion: string, ignorarId?: string) => {
  const n = normalizarDescripcion(descripcion);
  return filas.some((f) => f.id !== ignorarId && normalizarDescripcion(f.descripcion) === n);
};

export async function crearObservacion(actor: Actor, descripcion: string): Promise<ObservacionResult> {
  assertSuperadmin(actor);
  // Si el código choca por una carrera, se vuelve a leer y se genera el siguiente sufijo.
  for (let intento = 0; intento < INTENTOS; intento++) {
    const filas = await leerTodas();
    if (esDuplicada(filas, descripcion)) return { ok: false, error: DUPLICADO };
    const id = crypto.randomUUID();
    const codigo = generarCodigo(descripcion, filas.map((f) => f.codigo));
    try {
      await db.batch([
        db.insert(catalogoObservaciones).values({ id, codigo, descripcion }),
        auditoriaFila({
          actorId: actor.id,
          entidad: "OBSERVACION",
          accion: "CREAR",
          referencia: codigo,
          valorAnterior: null,
          valorNuevo: descripcion,
        }),
      ]);
      return { ok: true, data: { id, descripcion, activo: true } };
    } catch (e) {
      if (!esClaveDuplicada(e)) return { ok: false, error: ERROR_GENERICO };
    }
  }
  return { ok: false, error: ERROR_GENERICO };
}

export async function editarObservacion(actor: Actor, id: string, descripcion: string): Promise<ObservacionResult> {
  assertSuperadmin(actor);
  const filas = await leerTodas();
  const actual = filas.find((f) => f.id === id);
  if (!actual) return { ok: false, error: NO_ENCONTRADO };
  if (actual.descripcion === descripcion) return { ok: false, error: SIN_CAMBIOS };
  if (esDuplicada(filas, descripcion, id)) return { ok: false, error: DUPLICADO };
  try {
    await db.batch([
      db
        .update(catalogoObservaciones)
        .set({ descripcion, updatedAt: new Date() })
        .where(eq(catalogoObservaciones.id, id)),
      auditoriaFila({
        actorId: actor.id,
        entidad: "OBSERVACION",
        accion: "EDITAR",
        referencia: actual.codigo,
        valorAnterior: actual.descripcion,
        valorNuevo: descripcion,
      }),
    ]);
  } catch {
    return { ok: false, error: ERROR_GENERICO };
  }
  return { ok: true, data: { id, descripcion, activo: actual.activo } };
}

export async function setObservacionActiva(actor: Actor, id: string, activa: boolean): Promise<ObservacionResult> {
  assertSuperadmin(actor);
  const actual = (await leerTodas()).find((f) => f.id === id);
  if (!actual) return { ok: false, error: NO_ENCONTRADO };
  if (actual.activo === activa) return { ok: false, error: SIN_CAMBIOS };
  try {
    await db.batch([
      db
        .update(catalogoObservaciones)
        .set({ activo: activa, updatedAt: new Date() })
        .where(eq(catalogoObservaciones.id, id)),
      auditoriaFila({
        actorId: actor.id,
        entidad: "OBSERVACION",
        accion: activa ? "ACTIVAR" : "DESACTIVAR",
        referencia: actual.codigo,
        valorAnterior: actual.descripcion,
        valorNuevo: actual.descripcion,
      }),
    ]);
  } catch {
    return { ok: false, error: ERROR_GENERICO };
  }
  return { ok: true, data: { id, descripcion: actual.descripcion, activo: activa } };
}
