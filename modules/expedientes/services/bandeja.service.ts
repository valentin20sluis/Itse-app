import { and, asc, count, desc, eq, ilike, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import {
  establecimientos,
  expedienteDocumentos,
  expedientes,
  historialEstados,
  usuarios,
} from "@/db/schema";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import { PAGE_SIZE, type FiltrosBandeja } from "@/modules/expedientes/schemas/filtros-bandeja.schema";
import type {
  BandejaResultado,
  ExpedienteDetalle,
  HistorialItem,
} from "@/modules/expedientes/types/bandeja.types";

const nombreCompleto = (nombres: string, apellidos: string, email: string) =>
  `${nombres} ${apellidos}`.trim() || email;

// Lo que espera una acción del superadmin: aprobar el expediente, aprobar el certificado o generar la resolución de no cumple.
export const ESTADOS_PENDIENTES_JEFATURA = ["ENVIADO_JEFATURA", "CERTIFICADO_PENDIENTE_FIRMA", "NO_CUMPLE"] as const;

export async function listExpedientesPanel(
  actor: Actor,
  filtros: FiltrosBandeja,
): Promise<BandejaResultado> {
  if (actor.rol === "cliente") throw new Error("No autorizado");

  const where = and(
    isNotNull(expedientes.numero),
    filtros.pendientes
      ? inArray(expedientes.estado, [...ESTADOS_PENDIENTES_JEFATURA])
      : filtros.estado
        ? eq(expedientes.estado, filtros.estado)
        : undefined,
    filtros.q ? ilike(expedientes.numero, `%${filtros.q.replace(/[\\%_]/g, "\\$&")}%`) : undefined,
  );

  const [filas, [conteo]] = await Promise.all([
    db
      .select({
        id: expedientes.id,
        numero: expedientes.numero,
        establecimientoNombre: establecimientos.nombreComercial,
        nombres: usuarios.nombres,
        apellidos: usuarios.apellidos,
        email: usuarios.email,
        tipoTramite: expedientes.tipoTramite,
        nivelRiesgo: expedientes.nivelRiesgo,
        estado: expedientes.estado,
        presentadoAt: expedientes.presentadoAt,
      })
      .from(expedientes)
      .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
      .innerJoin(usuarios, eq(expedientes.usuarioId, usuarios.id))
      .where(where)
      .orderBy(desc(expedientes.presentadoAt))
      .limit(PAGE_SIZE)
      .offset((filtros.page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(expedientes).where(where),
  ]);

  return {
    items: filas.map(({ nombres, apellidos, email, numero, ...f }) => ({
      ...f,
      numero: numero ?? "",
      clienteNombre: nombreCompleto(nombres, apellidos, email),
    })),
    total: conteo?.total ?? 0,
    page: filtros.page,
    pageSize: PAGE_SIZE,
  };
}

export async function getExpedienteDetalle(
  actor: Actor,
  id: string,
): Promise<ExpedienteDetalle | null> {
  const [fila] = await db
    .select({ expediente: expedientes, establecimiento: establecimientos })
    .from(expedientes)
    .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
    .where(
      and(
        eq(expedientes.id, id),
        isNotNull(expedientes.numero),
        actor.rol === "cliente" ? eq(expedientes.usuarioId, actor.id) : undefined,
      ),
    )
    .limit(1);
  if (!fila) return null;

  const [documentos, historialRows] = await Promise.all([
    db.select().from(expedienteDocumentos).where(eq(expedienteDocumentos.expedienteId, id)),
    db
      .select({
        id: historialEstados.id,
        estadoAnterior: historialEstados.estadoAnterior,
        estadoNuevo: historialEstados.estadoNuevo,
        comentario: historialEstados.comentario,
        createdAt: historialEstados.createdAt,
        nombres: usuarios.nombres,
        apellidos: usuarios.apellidos,
        email: usuarios.email,
      })
      .from(historialEstados)
      .leftJoin(usuarios, eq(historialEstados.usuarioId, usuarios.id))
      .where(eq(historialEstados.expedienteId, id))
      .orderBy(asc(historialEstados.createdAt)),
  ]);

  const { expediente, establecimiento } = fila;
  const historial: HistorialItem[] = historialRows.map(({ nombres, apellidos, email, ...h }) => ({
    ...h,
    actorNombre:
      actor.rol !== "cliente" && email !== null
        ? nombreCompleto(nombres ?? "", apellidos ?? "", email)
        : undefined,
  }));

  return {
    expediente,
    establecimiento,
    solicitante: {
      nombre: expediente.solicitanteNombre,
      documento: expediente.solicitanteDocumento,
      telefono: expediente.solicitanteTelefono,
      email: expediente.solicitanteEmail,
      calidad: expediente.calidadSolicitante,
      razonSocial: expediente.razonSocial,
    },
    documentos,
    historial,
  };
}
