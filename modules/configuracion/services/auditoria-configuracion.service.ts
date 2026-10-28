import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { configuracionAuditoria, usuarios, type ConfiguracionAuditoria } from "@/db/schema";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";

export type EntidadConfiguracion = ConfiguracionAuditoria["entidad"];

export type AuditoriaConfigItem = {
  id: string;
  accion: ConfiguracionAuditoria["accion"];
  referencia: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
  actorNombre: string;
  createdAt: Date;
};

export function assertSuperadmin(actor: Actor) {
  if (actor.rol !== "superadmin") throw new Error("No autorizado");
}

// Devuelve la sentencia sin ejecutarla: el servicio de cada entidad la une a su cambio en un db.batch.
export function auditoriaFila(fila: {
  actorId: string;
  entidad: EntidadConfiguracion;
  accion: ConfiguracionAuditoria["accion"];
  referencia: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
}) {
  return db.insert(configuracionAuditoria).values(fila);
}

export async function listAuditoria(
  actor: Actor,
  entidad: EntidadConfiguracion,
  limite = 20,
): Promise<AuditoriaConfigItem[]> {
  assertSuperadmin(actor);
  const autor = alias(usuarios, "autor");
  const filas = await db
    .select({
      id: configuracionAuditoria.id,
      accion: configuracionAuditoria.accion,
      referencia: configuracionAuditoria.referencia,
      valorAnterior: configuracionAuditoria.valorAnterior,
      valorNuevo: configuracionAuditoria.valorNuevo,
      createdAt: configuracionAuditoria.createdAt,
      autorNombres: autor.nombres,
      autorApellidos: autor.apellidos,
      autorEmail: autor.email,
    })
    .from(configuracionAuditoria)
    .innerJoin(autor, eq(autor.id, configuracionAuditoria.actorId))
    .where(eq(configuracionAuditoria.entidad, entidad))
    .orderBy(desc(configuracionAuditoria.createdAt))
    .limit(limite);

  return filas.map((f) => ({
    id: f.id,
    accion: f.accion,
    referencia: f.referencia,
    valorAnterior: f.valorAnterior,
    valorNuevo: f.valorNuevo,
    createdAt: f.createdAt,
    actorNombre: `${f.autorNombres} ${f.autorApellidos}`.trim() || f.autorEmail,
  }));
}
