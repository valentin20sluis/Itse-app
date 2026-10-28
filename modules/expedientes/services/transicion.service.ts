import { and, eq, sql, type SQL } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { db } from "@/db";
import { expedientes, historialEstados } from "@/db/schema";
import { RIESGO_LABELS } from "@/modules/expedientes/constants/expediente-labels";
import type { EstadoExpediente } from "@/modules/expedientes/constants/estado-labels";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import type { NivelRiesgo } from "@/modules/expedientes/types/expediente.types";
import {
  DESTINOS_CON_FLUJO_PROPIO,
  puedeTransicionar,
  requiereMotivo,
} from "@/modules/expedientes/utils/transiciones";

export type TransicionResultado =
  | { status: "ok" }
  | { status: "no_encontrado" }
  | { status: "no_permitido" }
  | { status: "conflicto" }
  | { status: "motivo_requerido" };

function assertStaff(actor: Actor) {
  if (actor.rol === "cliente") throw new Error("No autorizado");
}

async function leer(id: string) {
  const [exp] = await db
    .select({ estado: expedientes.estado, nivelRiesgo: expedientes.nivelRiesgo, numero: expedientes.numero })
    .from(expedientes)
    .where(eq(expedientes.id, id))
    .limit(1);
  return exp?.numero ? exp : null;
}

// UPDATE condicionado al estado leído + INSERT del historial solo si ese UPDATE ganó, en una
// única transacción (db.batch). Si otro admin se adelantó, el UPDATE afecta 0 filas y no hay historial.
// ponytail: control optimista, sin bloqueo pesimista; basta para 2 admins.
// `extras` recibe la condición "el UPDATE ganó" para que sus INSERT viajen en el mismo batch y dependan de él.
export async function aplicar(
  actor: Actor,
  id: string,
  desde: EstadoExpediente,
  hasta: EstadoExpediente,
  cambios: Partial<typeof expedientes.$inferInsert>,
  guardas: SQL | undefined,
  comentario: string | null,
  extras?: (ganoUpdate: SQL) => BatchItem<"pg">[],
): Promise<TransicionResultado> {
  const ahora = new Date();
  const ganoUpdate = sql`exists (
    select 1 from ${expedientes}
    where ${expedientes.id} = ${id}::uuid
      and ${expedientes.updatedAt} = ${ahora.toISOString()}::timestamptz
      and ${expedientes.estado} = ${hasta}::estado_expediente
  )`;
  const [actualizados] = await db.batch([
    db
      .update(expedientes)
      .set({ ...cambios, updatedAt: ahora })
      .where(and(eq(expedientes.id, id), eq(expedientes.estado, desde), guardas))
      .returning({ id: expedientes.id }),
    db.insert(historialEstados).select(sql`
      select gen_random_uuid(), ${id}::uuid, ${desde}::estado_expediente, ${hasta}::estado_expediente,
        ${actor.id}::uuid, ${comentario}::text, now()
      where ${ganoUpdate}`),
    ...(extras?.(ganoUpdate) ?? []),
  ]);
  return { status: actualizados.length > 0 ? "ok" : "conflicto" };
}

export async function cambiarEstado(
  actor: Actor,
  id: string,
  input: { hasta: EstadoExpediente; comentario?: string },
): Promise<TransicionResultado> {
  assertStaff(actor);
  if (DESTINOS_CON_FLUJO_PROPIO.includes(input.hasta)) return { status: "no_permitido" };
  const exp = await leer(id);
  if (!exp) return { status: "no_encontrado" };
  if (!puedeTransicionar(exp.estado, input.hasta, actor.rol)) return { status: "no_permitido" };
  const comentario = input.comentario?.trim() || null;
  // El schema solo ve `hasta`; la devolución (mismo destino que "Iniciar revisión") se exige aquí.
  if (requiereMotivo(input.hasta, exp.estado) && (comentario?.length ?? 0) < 10) {
    return { status: "motivo_requerido" };
  }
  return aplicar(actor, id, exp.estado, input.hasta, { estado: input.hasta }, undefined, comentario);
}

export async function actualizarRiesgo(
  actor: Actor,
  id: string,
  input: { nivelRiesgo: NivelRiesgo; nota: string },
): Promise<TransicionResultado> {
  assertStaff(actor);
  const exp = await leer(id);
  if (!exp) return { status: "no_encontrado" };
  if (exp.estado !== "EN_REVISION" || exp.nivelRiesgo === input.nivelRiesgo) {
    return { status: "no_permitido" };
  }
  const anterior = exp.nivelRiesgo ? RIESGO_LABELS[exp.nivelRiesgo] : "Sin definir";
  return aplicar(
    actor,
    id,
    "EN_REVISION",
    "EN_REVISION",
    { nivelRiesgo: input.nivelRiesgo },
    exp.nivelRiesgo ? eq(expedientes.nivelRiesgo, exp.nivelRiesgo) : undefined,
    `Nivel de riesgo: ${anterior} → ${RIESGO_LABELS[input.nivelRiesgo]}. ${input.nota.trim()}`,
  );
}
