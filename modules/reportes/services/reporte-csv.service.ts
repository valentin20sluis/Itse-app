import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { establecimientos, expedientes } from "@/db/schema";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import { ESTADO_LABELS } from "@/modules/expedientes/constants/estado-labels";
import { RIESGO_LABELS, TIPO_TRAMITE_LABELS } from "@/modules/expedientes/constants/expediente-labels";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";
import type { FiltrosReporte } from "@/modules/reportes/schemas/filtros-reporte.schema";
import { condicionCohorte } from "@/modules/reportes/services/reportes.service";
import { MAX_FILAS_CSV, type FilaCsv } from "@/modules/reportes/types/reporte.types";

export const ENCABEZADOS_CSV = [
  "Número",
  "Fecha de presentación",
  "Estado",
  "Nivel de riesgo",
  "Tipo de trámite",
  "Distrito",
];

// Solo columnas no personales: sin solicitante, contacto, documento, nombre comercial ni inspectores.
export async function listExpedientesCsv(
  actor: Actor,
  filtros: FiltrosReporte,
  ahora: Date = new Date(),
): Promise<{ filas: FilaCsv[]; truncado: boolean }> {
  if (actor.rol === "cliente") throw new Error("No autorizado");

  const { where } = condicionCohorte(filtros, ahora);
  const filas = await db
    .select({
      numero: expedientes.numero,
      presentadoAt: expedientes.presentadoAt,
      estado: expedientes.estado,
      nivelRiesgo: expedientes.nivelRiesgo,
      tipoTramite: expedientes.tipoTramite,
      distrito: establecimientos.distrito,
    })
    .from(expedientes)
    .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
    .where(where)
    .orderBy(desc(expedientes.presentadoAt))
    .limit(MAX_FILAS_CSV + 1);

  return {
    truncado: filas.length > MAX_FILAS_CSV,
    filas: filas.slice(0, MAX_FILAS_CSV).map((f) => ({
      numero: f.numero ?? "",
      fechaPresentacion: f.presentadoAt ? formatFecha(f.presentadoAt) : "",
      estado: ESTADO_LABELS[f.estado].label,
      nivelRiesgo: f.nivelRiesgo ? RIESGO_LABELS[f.nivelRiesgo] : "Sin clasificar",
      tipoTramite: TIPO_TRAMITE_LABELS[f.tipoTramite],
      distrito: f.distrito,
    })),
  };
}
