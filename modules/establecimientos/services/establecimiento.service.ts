import { and, desc, eq, isNull, notExists, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { establecimientos, expedientes } from "@/db/schema";
import type { EstablecimientoInput } from "@/modules/establecimientos/schemas/establecimiento.schema";
import type { Actor, Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";

export class EstablecimientoConExpedientesError extends Error {
  constructor() {
    super("El establecimiento tiene expedientes en trámite");
    this.name = "EstablecimientoConExpedientesError";
  }
}

export const ESTADOS_NO_BLOQUEANTES: (typeof expedientes.$inferSelect.estado)[] = [
  "BORRADOR",
  "ANULADO",
  "ENTREGADO",
  "NO_CUMPLE",
  "DERIVADO_COMERCIALIZACION",
];

function assertCliente(actor: Actor) {
  if (actor.rol !== "cliente") throw new Error("No autorizado");
}

function toValues(input: EstablecimientoInput) {
  return {
    razonSocial: input.razonSocial,
    ruc: input.ruc,
    nombreComercial: input.nombreComercial,
    direccion: input.direccion,
    distrito: input.distrito,
    numeroGiro: input.numeroGiro,
    funcion: input.funcion,
    giro: input.giro,
    areaM2: String(input.areaM2),
    numeroPisos: input.numeroPisos,
    pisoEstablecimiento: input.pisoEstablecimiento,
    numeroCamas: input.funcion === "HOSPEDAJE" ? input.numeroCamas : null,
  };
}

const ownActive = (actor: Actor, id: string) =>
  and(
    eq(establecimientos.id, id),
    eq(establecimientos.usuarioId, actor.id),
    isNull(establecimientos.archivadoAt),
  );

export async function listOwnEstablecimientos(actor: Actor): Promise<Establecimiento[]> {
  assertCliente(actor);
  return db
    .select()
    .from(establecimientos)
    .where(and(eq(establecimientos.usuarioId, actor.id), isNull(establecimientos.archivadoAt)))
    .orderBy(desc(establecimientos.createdAt));
}

export async function getEstablecimientoById(
  actor: Actor,
  id: string,
): Promise<Establecimiento | null> {
  const where = actor.rol === "cliente" ? ownActive(actor, id) : eq(establecimientos.id, id);
  const [row] = await db.select().from(establecimientos).where(where).limit(1);
  return row ?? null;
}

export async function createEstablecimiento(
  actor: Actor,
  input: EstablecimientoInput,
): Promise<Establecimiento> {
  assertCliente(actor);
  const [row] = await db
    .insert(establecimientos)
    .values({ ...toValues(input), usuarioId: actor.id })
    .returning();
  return row;
}

export async function updateEstablecimiento(
  actor: Actor,
  id: string,
  input: EstablecimientoInput,
): Promise<Establecimiento | null> {
  assertCliente(actor);
  const [row] = await db
    .update(establecimientos)
    .set({ ...toValues(input), updatedAt: new Date() })
    .where(ownActive(actor, id))
    .returning();
  return row ?? null;
}

export async function archiveEstablecimiento(
  actor: Actor,
  id: string,
): Promise<Establecimiento | null> {
  assertCliente(actor);
  const now = new Date();
  const [row] = await db
    .update(establecimientos)
    .set({ archivadoAt: now, updatedAt: now })
    .where(
      and(
        ownActive(actor, id),
        notExists(
          db
            .select({ id: expedientes.id })
            .from(expedientes)
            .where(
              and(
                eq(expedientes.establecimientoId, establecimientos.id),
                notInArray(expedientes.estado, ESTADOS_NO_BLOQUEANTES),
              ),
            ),
        ),
      ),
    )
    .returning();
  if (row) return row;

  // Solo se revela el bloqueo si el establecimiento es propio y está activo.
  const [own] = await db.select().from(establecimientos).where(ownActive(actor, id)).limit(1);
  if (own) throw new EstablecimientoConExpedientesError();
  return null;
}
