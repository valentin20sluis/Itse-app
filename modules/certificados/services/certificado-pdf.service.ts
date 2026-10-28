import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { certificados, establecimientos, expedientes, historialEstados, usuarios } from "@/db/schema";
import { certificadoPdfVisible } from "@/modules/certificados/utils/certificado-acceso";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import type { NivelRiesgo } from "@/modules/expedientes/types/expediente.types";
import { tipoItsePorRiesgo } from "@/modules/expedientes/utils/riesgo";

export type CertificadoPdfData = {
  numero: string;
  codigo: string;
  borrador: boolean;
  emitidoAt: Date | null;
  venceAt: Date | null;
  expedienteNumero: string;
  solicitante: { nombre: string; razonSocial: string | null };
  establecimiento: { nombreComercial: string; direccion: string; distrito: string; giro: string; areaM2: string };
  nivelRiesgo: NivelRiesgo;
  tipoItse: "PREVIA" | "POSTERIOR";
  jefeNombre: string | null;
};

export async function getCertificadoPdfData(
  actor: Actor,
  expedienteId: string,
): Promise<CertificadoPdfData | null> {
  const [fila] = await db
    .select({
      numero: certificados.numero,
      codigo: certificados.codigo,
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
      areaM2: establecimientos.areaM2,
    })
    .from(certificados)
    .innerJoin(expedientes, eq(certificados.expedienteId, expedientes.id))
    .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
    .where(eq(certificados.expedienteId, expedienteId))
    .limit(1);
  const borrador = fila?.estado === "CERTIFICADO_PENDIENTE_FIRMA";
  if (
    !fila ||
    (!borrador && (!fila.emitidoAt || !fila.venceAt)) ||
    !fila.expedienteNumero ||
    !fila.nivelRiesgo ||
    !certificadoPdfVisible(actor.rol, fila.estado) ||
    (actor.rol === "cliente" && fila.usuarioId !== actor.id)
  ) {
    return null;
  }

  const [jefe] = await db
    .select({ nombres: usuarios.nombres, apellidos: usuarios.apellidos })
    .from(historialEstados)
    .innerJoin(usuarios, eq(historialEstados.usuarioId, usuarios.id))
    .where(and(eq(historialEstados.expedienteId, expedienteId), eq(historialEstados.estadoNuevo, "FINALIZADO")))
    .orderBy(desc(historialEstados.createdAt))
    .limit(1);
  const jefeNombre = jefe ? `${jefe.nombres} ${jefe.apellidos}`.trim() : "";

  return {
    numero: fila.numero,
    codigo: fila.codigo,
    borrador,
    emitidoAt: fila.emitidoAt,
    venceAt: fila.venceAt,
    expedienteNumero: fila.expedienteNumero,
    solicitante: { nombre: fila.solicitanteNombre ?? "", razonSocial: fila.razonSocial },
    establecimiento: {
      nombreComercial: fila.nombreComercial,
      direccion: fila.direccion,
      distrito: fila.distrito,
      giro: fila.giro,
      areaM2: fila.areaM2,
    },
    nivelRiesgo: fila.nivelRiesgo,
    tipoItse: tipoItsePorRiesgo(fila.nivelRiesgo),
    jefeNombre: jefeNombre || null,
  };
}
