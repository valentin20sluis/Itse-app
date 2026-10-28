import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { certificados, establecimientos, expedientes, historialEstados, usuarios } from "@/db/schema";
import { certificadoDescargable } from "@/modules/certificados/utils/certificado-acceso";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";

export type ResolucionPdfData = {
  resolucionNumero: string;
  resolucionAt: Date;
  certificadoNumero: string;
  emitidoAt: Date;
  venceAt: Date;
  expedienteNumero: string;
  solicitante: { nombre: string; razonSocial: string | null };
  establecimiento: { nombreComercial: string; direccion: string; distrito: string; giro: string };
  nivelRiesgo: NonNullable<(typeof expedientes.$inferSelect)["nivelRiesgo"]>;
  jefeNombre: string | null;
};

export type ResolucionNoCumplePdfData = {
  tipo: "NO_CUMPLE";
  resolucionNumero: string;
  resolucionAt: Date;
  expedienteNumero: string;
  solicitante: { nombre: string; razonSocial: string | null };
  establecimiento: { nombreComercial: string; direccion: string; distrito: string; giro: string };
  nivelRiesgo: NonNullable<(typeof expedientes.$inferSelect)["nivelRiesgo"]>;
  jefeNombre: string | null;
};

async function getJefeNombre(expedienteId: string): Promise<string | null> {
  const [jefe] = await db
    .select({ nombres: usuarios.nombres, apellidos: usuarios.apellidos })
    .from(historialEstados)
    .innerJoin(usuarios, eq(historialEstados.usuarioId, usuarios.id))
    .where(and(eq(historialEstados.expedienteId, expedienteId), eq(historialEstados.estadoNuevo, "FINALIZADO")))
    .orderBy(desc(historialEstados.createdAt))
    .limit(1);
  return (jefe ? `${jefe.nombres} ${jefe.apellidos}`.trim() : "") || null;
}

export async function getResolucionPdfData(
  actor: Actor,
  expedienteId: string,
): Promise<ResolucionPdfData | null> {
  const [fila] = await db
    .select({
      resolucionNumero: certificados.resolucionNumero,
      resolucionAt: certificados.resolucionAt,
      certificadoNumero: certificados.numero,
      emitidoAt: certificados.emitidoAt,
      venceAt: certificados.venceAt,
      expedienteNumero: expedientes.numero,
      estado: expedientes.estado,
      usuarioId: expedientes.usuarioId,
      nivelRiesgo: expedientes.nivelRiesgo,
      solicitanteNombre: expedientes.solicitanteNombre,
      razonSocial: expedientes.razonSocial,
      nombreComercial: establecimientos.nombreComercial,
      direccion: establecimientos.direccion,
      distrito: establecimientos.distrito,
      giro: establecimientos.giro,
    })
    .from(certificados)
    .innerJoin(expedientes, eq(certificados.expedienteId, expedientes.id))
    .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
    .where(eq(certificados.expedienteId, expedienteId))
    .limit(1);
  if (
    !fila ||
    !fila.resolucionNumero ||
    !fila.resolucionAt ||
    !fila.emitidoAt ||
    !fila.venceAt ||
    !fila.expedienteNumero ||
    !fila.nivelRiesgo ||
    !certificadoDescargable(actor.rol, fila.estado) ||
    (actor.rol === "cliente" && fila.usuarioId !== actor.id)
  ) {
    return null;
  }

  return {
    resolucionNumero: fila.resolucionNumero,
    resolucionAt: fila.resolucionAt,
    certificadoNumero: fila.certificadoNumero,
    emitidoAt: fila.emitidoAt,
    venceAt: fila.venceAt,
    expedienteNumero: fila.expedienteNumero,
    solicitante: { nombre: fila.solicitanteNombre ?? "", razonSocial: fila.razonSocial },
    establecimiento: {
      nombreComercial: fila.nombreComercial,
      direccion: fila.direccion,
      distrito: fila.distrito,
      giro: fila.giro,
    },
    nivelRiesgo: fila.nivelRiesgo,
    jefeNombre: await getJefeNombre(expedienteId),
  };
}

export async function getResolucionNoCumplePdfData(
  actor: Actor,
  expedienteId: string,
): Promise<ResolucionNoCumplePdfData | null> {
  const [fila] = await db
    .select({
      resolucionNumero: expedientes.resolucionNoCumpleNumero,
      resolucionAt: expedientes.resolucionNoCumpleAt,
      expedienteNumero: expedientes.numero,
      estado: expedientes.estado,
      usuarioId: expedientes.usuarioId,
      nivelRiesgo: expedientes.nivelRiesgo,
      solicitanteNombre: expedientes.solicitanteNombre,
      razonSocial: expedientes.razonSocial,
      nombreComercial: establecimientos.nombreComercial,
      direccion: establecimientos.direccion,
      distrito: establecimientos.distrito,
      giro: establecimientos.giro,
    })
    .from(expedientes)
    .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
    .where(eq(expedientes.id, expedienteId))
    .limit(1);
  if (
    !fila ||
    !fila.resolucionNumero ||
    !fila.resolucionAt ||
    !fila.expedienteNumero ||
    !fila.nivelRiesgo ||
    !certificadoDescargable(actor.rol, fila.estado) ||
    (actor.rol === "cliente" && fila.usuarioId !== actor.id)
  ) {
    return null;
  }

  return {
    tipo: "NO_CUMPLE",
    resolucionNumero: fila.resolucionNumero,
    resolucionAt: fila.resolucionAt,
    expedienteNumero: fila.expedienteNumero,
    solicitante: { nombre: fila.solicitanteNombre ?? "", razonSocial: fila.razonSocial },
    establecimiento: {
      nombreComercial: fila.nombreComercial,
      direccion: fila.direccion,
      distrito: fila.distrito,
      giro: fila.giro,
    },
    nivelRiesgo: fila.nivelRiesgo,
    jefeNombre: await getJefeNombre(expedienteId),
  };
}
