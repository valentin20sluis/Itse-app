import { eq } from "drizzle-orm";
import { db } from "@/db";
import { certificados, establecimientos, expedientes } from "@/db/schema";
import { normalizarCodigo } from "@/modules/certificados/utils/certificado-codigo";
import { estadoCertificado, type EstadoCertificado } from "@/modules/certificados/utils/vigencia";

export type VerificacionData = {
  numero: string;
  nombreComercial: string;
  distrito: string;
  emitidoAt: Date;
  venceAt: Date;
  estado: EstadoCertificado;
};

export type VerificacionResultado = { status: "ok"; data: VerificacionData } | { status: "no_encontrado" };

const ESTADOS_VERIFICABLES = ["FINALIZADO", "ENTREGADO", "ANULADO"];

// Consulta pública sin sesión: solo datos mínimos y la misma respuesta para código mal escrito o inexistente.
export async function verificarCertificado(
  codigoCrudo: string,
  ahora: Date = new Date(),
): Promise<VerificacionResultado> {
  const codigo = normalizarCodigo(codigoCrudo);
  if (!codigo) return { status: "no_encontrado" };

  const [fila] = await db
    .select({
      numero: certificados.numero,
      emitidoAt: certificados.emitidoAt,
      venceAt: certificados.venceAt,
      estado: expedientes.estado,
      nombreComercial: establecimientos.nombreComercial,
      distrito: establecimientos.distrito,
    })
    .from(certificados)
    .innerJoin(expedientes, eq(certificados.expedienteId, expedientes.id))
    .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
    .where(eq(certificados.codigo, codigo))
    .limit(1);
  if (!fila || !fila.emitidoAt || !fila.venceAt || !ESTADOS_VERIFICABLES.includes(fila.estado)) {
    return { status: "no_encontrado" };
  }

  return {
    status: "ok",
    data: {
      numero: fila.numero,
      nombreComercial: fila.nombreComercial,
      distrito: fila.distrito,
      emitidoAt: fila.emitidoAt,
      venceAt: fila.venceAt,
      estado: estadoCertificado({ venceAt: fila.venceAt, revocado: fila.estado === "ANULADO" }, ahora),
    },
  };
}
