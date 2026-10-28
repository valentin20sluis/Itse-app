import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { certificados, expedientes } from "@/db/schema";
import { calcularVencimiento } from "@/modules/certificados/utils/vigencia";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import {
  codigoPg,
  getAnioLima,
  MAX_INTENTOS_NUMERO,
} from "@/modules/expedientes/services/expediente.service";
import { aplicar, type TransicionResultado } from "@/modules/expedientes/services/transicion.service";
import { puedeTransicionar } from "@/modules/expedientes/utils/transiciones";

export const COMENTARIO_APROBADO =
  "Certificado aprobado y Resolución Gerencial generada. Pendiente de entrega.";

// Correlativo RG-AAAA-NNNN del año dentro del UPDATE (max + 1); el índice único detecta choques concurrentes.
function resolucionSiguiente(anio: number) {
  return sql`(select 'RG-' || ${String(anio)}::text || '-' || lpad(n::text, greatest(4, length(n::text)), '0')
    from (select coalesce(max(split_part(resolucion_numero, '-', 3)::int), 0) + 1 as n
      from certificados where resolucion_numero like ${`RG-${anio}-%`}) t)`;
}

export async function aprobarCertificado(
  actor: Actor,
  id: string,
  ahora: Date = new Date(),
): Promise<TransicionResultado> {
  if (actor.rol === "cliente") throw new Error("No autorizado");
  if (actor.rol !== "superadmin") return { status: "no_permitido" };
  const [exp] = await db
    .select({
      estado: expedientes.estado,
      numero: expedientes.numero,
      certificadoId: certificados.id,
      emitidoAt: certificados.emitidoAt,
    })
    .from(expedientes)
    .leftJoin(certificados, eq(certificados.expedienteId, expedientes.id))
    .where(eq(expedientes.id, id))
    .limit(1);
  if (!exp?.numero) return { status: "no_encontrado" };
  if (
    exp.estado !== "CERTIFICADO_PENDIENTE_FIRMA" ||
    !exp.certificadoId ||
    exp.emitidoAt ||
    !puedeTransicionar(exp.estado, "FINALIZADO", actor.rol)
  ) {
    return { status: "no_permitido" };
  }
  const anio = getAnioLima(ahora);
  const venceAt = calcularVencimiento(ahora);
  for (let intento = 1; ; intento++) {
    try {
      return await aplicar(
        actor,
        id,
        "CERTIFICADO_PENDIENTE_FIRMA",
        "FINALIZADO",
        { estado: "FINALIZADO" },
        undefined,
        COMENTARIO_APROBADO,
        (gano) => [
          db
            .update(certificados)
            .set({
              emitidoAt: ahora,
              venceAt,
              resolucionNumero: resolucionSiguiente(anio),
              resolucionAt: ahora,
            })
            .where(and(eq(certificados.expedienteId, id), isNull(certificados.emitidoAt), gano)),
        ],
      );
    } catch (e) {
      if (codigoPg(e) !== "23505" || intento >= MAX_INTENTOS_NUMERO) throw e;
    }
  }
}
