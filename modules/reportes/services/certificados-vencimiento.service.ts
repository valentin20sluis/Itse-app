import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { certificados, establecimientos, expedientes, type nivelRiesgoEnum } from "@/db/schema";
import { limitesFiltro } from "@/modules/certificados/services/certificado-lista.service";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";

const DIA_MS = 86_400_000;
const DIAS_PRIMER_TRAMO = 30;

export type FiltrosVencimiento = {
  riesgo?: (typeof nivelRiesgoEnum.enumValues)[number];
  distrito?: string;
};

export type CertificadosPorVencimiento = {
  vencidos: number;
  hasta30: number;
  de31a60: number;
  vigentes: number;
};

const contar = (condicion: ReturnType<typeof sql>) =>
  sql<number>`count(*) filter (where ${condicion})`.mapWith(Number);

export async function contarCertificadosPorVencimiento(
  actor: Actor,
  filtros: FiltrosVencimiento = {},
  ahora: Date = new Date(),
): Promise<CertificadosPorVencimiento> {
  if (actor.rol === "cliente") throw new Error("No autorizado");

  // Mismos bordes que `estadoCertificado`: `desde` es el inicio de hoy en Lima, `hasta` es hoy + 60 días.
  const { desde: H, hasta: H60 } = limitesFiltro("por-vencer", ahora) as { desde: Date; hasta: Date };
  const H30 = new Date(H.getTime() + DIAS_PRIMER_TRAMO * DIA_MS);
  const venceAt = certificados.venceAt;

  const [fila] = await db
    .select({
      vencidos: contar(sql`${venceAt} < ${H}`),
      hasta30: contar(sql`${venceAt} >= ${H} and ${venceAt} <= ${H30}`),
      de31a60: contar(sql`${venceAt} > ${H30} and ${venceAt} <= ${H60}`),
      vigentes: contar(sql`${venceAt} > ${H60}`),
    })
    .from(certificados)
    .innerJoin(expedientes, eq(certificados.expedienteId, expedientes.id))
    .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
    .where(
      and(
        isNotNull(certificados.emitidoAt),
        isNotNull(venceAt),
        inArray(expedientes.estado, ["FINALIZADO", "ENTREGADO"]),
        filtros.riesgo ? eq(expedientes.nivelRiesgo, filtros.riesgo) : undefined,
        filtros.distrito ? eq(establecimientos.distrito, filtros.distrito) : undefined,
      ),
    );

  return {
    vencidos: fila?.vencidos ?? 0,
    hasta30: fila?.hasta30 ?? 0,
    de31a60: fila?.de31a60 ?? 0,
    vigentes: fila?.vigentes ?? 0,
  };
}
