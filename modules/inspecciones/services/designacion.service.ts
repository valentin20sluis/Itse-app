import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { designaciones, expedientes, inspectores } from "@/db/schema";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import { inspectoresRequeridos } from "@/modules/expedientes/utils/riesgo";
import { puedeTransicionar } from "@/modules/expedientes/utils/transiciones";
import { aplicar } from "@/modules/expedientes/services/transicion.service";

export type DesignacionResultado =
  | { status: "ok" }
  | { status: "no_encontrado" }
  | { status: "no_permitido" }
  | { status: "cantidad_invalida" }
  | { status: "inspector_invalido" }
  | { status: "conflicto" };

export type InspectorElegible = { id: string; nombre: string; documento: string };

export type ResumenInspeccion = {
  total: number;
  inspectores?: { nombre: string; documento: string; telefono: string }[];
};

function assertPersonal(actor: Actor) {
  if (actor.rol !== "admin" && actor.rol !== "superadmin") throw new Error("No autorizado");
}

const nombreCompleto = sql<string>`${inspectores.apellidos} || ', ' || ${inspectores.nombres}`;

export async function listInspectoresElegibles(actor: Actor): Promise<InspectorElegible[]> {
  assertPersonal(actor);
  return db
    .select({ id: inspectores.id, nombre: nombreCompleto, documento: inspectores.documento })
    .from(inspectores)
    .where(eq(inspectores.activo, true))
    .orderBy(asc(inspectores.apellidos), asc(inspectores.nombres));
}

export async function designarInspectores(
  actor: Actor,
  expedienteId: string,
  inspectorIds: string[],
): Promise<DesignacionResultado> {
  assertPersonal(actor);
  const [exp] = await db
    .select({ estado: expedientes.estado, nivelRiesgo: expedientes.nivelRiesgo, numero: expedientes.numero })
    .from(expedientes)
    .where(eq(expedientes.id, expedienteId))
    .limit(1);
  if (!exp?.numero) return { status: "no_encontrado" };
  if (
    exp.estado !== "APROBADO_JEFATURA" ||
    !exp.nivelRiesgo ||
    !puedeTransicionar(exp.estado, "INSPECTOR_DESIGNADO", actor.rol)
  ) {
    return { status: "no_permitido" };
  }
  const n = inspectoresRequeridos(exp.nivelRiesgo);
  if (inspectorIds.length !== n || new Set(inspectorIds).size !== n) {
    return { status: "cantidad_invalida" };
  }
  const activos = and(inArray(inspectores.id, inspectorIds), eq(inspectores.activo, true));
  const validos = await db.select({ id: inspectores.id }).from(inspectores).where(activos);
  if (validos.length !== n) return { status: "inspector_invalido" };

  // Si un inspector se desactivó tras la lectura, el conteo no coincide y el UPDATE afecta 0 filas.
  const sigueActivos = sql`(select count(*) from ${inspectores} where ${activos}) = ${n}`;
  const r = await aplicar(
    actor,
    expedienteId,
    "APROBADO_JEFATURA",
    "INSPECTOR_DESIGNADO",
    { estado: "INSPECTOR_DESIGNADO" },
    sigueActivos,
    `Inspectores designados: ${n}.`,
    (ganoUpdate) =>
      inspectorIds.map((inspectorId) =>
        db.insert(designaciones).select(sql`
          select gen_random_uuid(), ${expedienteId}::uuid, ${inspectorId}::uuid, now()
          where ${ganoUpdate}`),
      ),
  );
  return r.status === "ok" ? { status: "ok" } : { status: "conflicto" };
}

export async function getResumenInspeccion(
  actor: Actor,
  expedienteId: string,
): Promise<ResumenInspeccion> {
  if (actor.rol === "cliente") {
    const [propio] = await db
      .select({ id: expedientes.id })
      .from(expedientes)
      .where(and(eq(expedientes.id, expedienteId), eq(expedientes.usuarioId, actor.id)))
      .limit(1);
    if (!propio) return { total: 0 };
    const [{ total }] = await db
      .select({ total: count() })
      .from(designaciones)
      .where(eq(designaciones.expedienteId, expedienteId));
    return { total };
  }
  const filas = await db
    .select({ nombre: nombreCompleto, documento: inspectores.documento, telefono: inspectores.telefono })
    .from(designaciones)
    .innerJoin(inspectores, eq(designaciones.inspectorId, inspectores.id))
    .where(eq(designaciones.expedienteId, expedienteId))
    .orderBy(asc(inspectores.apellidos), asc(inspectores.nombres));
  return { total: filas.length, inspectores: filas };
}
