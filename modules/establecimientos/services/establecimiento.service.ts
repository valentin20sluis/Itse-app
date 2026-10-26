import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { establecimientos } from "@/db/schema";
import type { EstablecimientoInput } from "@/modules/establecimientos/schemas/establecimiento.schema";
import type { Actor, Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";

function assertCliente(actor: Actor) {
  if (actor.rol !== "cliente") throw new Error("No autorizado");
}

function toValues(input: EstablecimientoInput) {
  return {
    nombreComercial: input.nombreComercial,
    direccion: input.direccion,
    distrito: input.distrito,
    giro: input.giro,
    areaM2: String(input.areaM2),
    numeroPisos: input.numeroPisos,
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
    .where(ownActive(actor, id))
    .returning();
  return row ?? null;
}
