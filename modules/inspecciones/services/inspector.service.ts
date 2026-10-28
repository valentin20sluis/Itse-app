import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { inspectores, type Inspector } from "@/db/schema";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import type { InspectorInput } from "@/modules/inspecciones/schemas/inspector.schema";

export class InspectorDuplicadoError extends Error {
  constructor() {
    super("Ya existe un inspector con ese documento");
    this.name = "InspectorDuplicadoError";
  }
}

function assertPersonal(actor: Actor) {
  if (actor.rol !== "admin" && actor.rol !== "superadmin") throw new Error("No autorizado");
}

function esViolacionUnicidad(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const err = e as { code?: unknown; cause?: unknown };
  return err.code === "23505" || esViolacionUnicidad(err.cause);
}

async function conDuplicado<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (e) {
    if (esViolacionUnicidad(e)) throw new InspectorDuplicadoError();
    throw e;
  }
}

export async function listInspectores(actor: Actor): Promise<Inspector[]> {
  assertPersonal(actor);
  return db
    .select()
    .from(inspectores)
    .orderBy(desc(inspectores.activo), asc(inspectores.apellidos), asc(inspectores.nombres));
}

export async function createInspector(actor: Actor, input: InspectorInput): Promise<Inspector> {
  assertPersonal(actor);
  const [row] = await conDuplicado(() => db.insert(inspectores).values(input).returning());
  return row;
}

export async function updateInspector(
  actor: Actor,
  id: string,
  input: InspectorInput,
): Promise<Inspector | null> {
  assertPersonal(actor);
  const [row] = await conDuplicado(() =>
    db
      .update(inspectores)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(inspectores.id, id))
      .returning(),
  );
  return row ?? null;
}

export async function setInspectorActivo(
  actor: Actor,
  id: string,
  activo: boolean,
): Promise<Inspector | null> {
  assertPersonal(actor);
  const [row] = await db
    .update(inspectores)
    .set({ activo, updatedAt: new Date() })
    .where(eq(inspectores.id, id))
    .returning();
  return row ?? null;
}
