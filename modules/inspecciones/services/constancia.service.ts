import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  designaciones,
  establecimientos,
  expedientes,
  historialEstados,
  inspectores,
  usuarios,
} from "@/db/schema";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import { tipoItsePorRiesgo } from "@/modules/expedientes/utils/riesgo";
import { PROFESION_LABELS } from "@/modules/inspecciones/constants/profesiones";
import { numeroConstancia } from "@/modules/inspecciones/utils/constancia-numero";

export type ConstanciaData = {
  numero: string;
  expedienteNumero: string;
  establecimiento: { nombreComercial: string; direccion: string; distrito: string };
  nivelRiesgo: NonNullable<(typeof expedientes.$inferSelect)["nivelRiesgo"]>;
  tipoItse: "PREVIA" | "POSTERIOR";
  inspectores: { nombre: string; documento: string; profesion: string | null }[];
  fechaDesignacion: Date;
  jefeNombre: string | null;
};

export async function getConstanciaData(actor: Actor, expedienteId: string): Promise<ConstanciaData | null> {
  if (actor.rol !== "admin" && actor.rol !== "superadmin") throw new Error("No autorizado");

  const [exp] = await db
    .select({
      numero: expedientes.numero,
      estado: expedientes.estado,
      nivelRiesgo: expedientes.nivelRiesgo,
      nombreComercial: establecimientos.nombreComercial,
      direccion: establecimientos.direccion,
      distrito: establecimientos.distrito,
    })
    .from(expedientes)
    .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
    .where(eq(expedientes.id, expedienteId))
    .limit(1);
  if (!exp?.numero || !exp.nivelRiesgo || exp.estado === "ANULADO") return null;
  const numero = numeroConstancia(exp.numero);
  if (!numero) return null;

  const filas = await db
    .select({
      nombre: sql<string>`${inspectores.apellidos} || ', ' || ${inspectores.nombres}`,
      documento: inspectores.documento,
      profesion: inspectores.profesion,
      designadoAt: designaciones.createdAt,
    })
    .from(designaciones)
    .innerJoin(inspectores, eq(designaciones.inspectorId, inspectores.id))
    .where(eq(designaciones.expedienteId, expedienteId))
    .orderBy(asc(inspectores.apellidos), asc(inspectores.nombres));
  if (filas.length === 0) return null;

  const [jefe] = await db
    .select({ nombres: usuarios.nombres, apellidos: usuarios.apellidos })
    .from(historialEstados)
    .innerJoin(usuarios, eq(historialEstados.usuarioId, usuarios.id))
    .where(and(eq(historialEstados.expedienteId, expedienteId), eq(historialEstados.estadoNuevo, "APROBADO_JEFATURA")))
    .orderBy(desc(historialEstados.createdAt))
    .limit(1);
  const jefeNombre = jefe ? `${jefe.nombres} ${jefe.apellidos}`.trim() : "";

  return {
    numero,
    expedienteNumero: exp.numero,
    establecimiento: {
      nombreComercial: exp.nombreComercial,
      direccion: exp.direccion,
      distrito: exp.distrito,
    },
    nivelRiesgo: exp.nivelRiesgo,
    tipoItse: tipoItsePorRiesgo(exp.nivelRiesgo),
    inspectores: filas.map((f) => ({
      nombre: f.nombre,
      documento: f.documento,
      profesion: f.profesion ? PROFESION_LABELS[f.profesion] : null,
    })),
    fechaDesignacion: new Date(Math.min(...filas.map((f) => f.designadoAt.getTime()))),
    jefeNombre: jefeNombre || null,
  };
}
