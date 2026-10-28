import { and, asc, desc, eq, gte, inArray, isNotNull, lt, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { certificados, establecimientos, expedientes } from "@/db/schema";
import type { FiltroCertificados } from "@/modules/certificados/schemas/filtro-certificados.schema";
import {
  DIAS_ALERTA_VENCIMIENTO,
  diasParaVencer,
  estadoCertificado,
  type EstadoCertificado,
} from "@/modules/certificados/utils/vigencia";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import { aInputLima, parseFechaLima } from "@/modules/inspecciones/utils/fecha-diligencia";

export const MAX_FILAS_CERTIFICADOS = 100;
const DIA_MS = 86_400_000;

export type CertificadoPanelFila = {
  expedienteId: string;
  expedienteNumero: string;
  numero: string;
  nombreComercial: string;
  distrito: string;
  emitidoAt: Date;
  venceAt: Date;
  diasRestantes: number;
  estado: EstadoCertificado;
};

export type CertificadoClienteFila = Omit<CertificadoPanelFila, "expedienteNumero" | "distrito">;

// Límites de `vence_at` de cada filtro, con los mismos bordes que `estadoCertificado`:
// por vencer = [inicio de hoy, inicio de hoy + 60 días]; vencidos = antes del inicio de hoy.
export function limitesFiltro(filtro: FiltroCertificados, ahora: Date) {
  const hoy = parseFechaLima(aInputLima(ahora)) as Date;
  if (filtro === "por-vencer") {
    return { desde: hoy, hasta: new Date(hoy.getTime() + DIAS_ALERTA_VENCIMIENTO * DIA_MS) };
  }
  if (filtro === "vencidos") return { antesDe: hoy };
  return {};
}

export async function listCertificadosPanel(
  actor: Actor,
  filtro: FiltroCertificados,
  ahora: Date = new Date(),
): Promise<CertificadoPanelFila[]> {
  if (actor.rol === "cliente") throw new Error("No autorizado");

  const { desde, hasta, antesDe } = limitesFiltro(filtro, ahora);
  const filas = await db
    .select({
      expedienteId: expedientes.id,
      expedienteNumero: expedientes.numero,
      numero: certificados.numero,
      nombreComercial: establecimientos.nombreComercial,
      distrito: establecimientos.distrito,
      emitidoAt: certificados.emitidoAt,
      venceAt: certificados.venceAt,
      estado: expedientes.estado,
    })
    .from(certificados)
    .innerJoin(expedientes, eq(certificados.expedienteId, expedientes.id))
    .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
    .where(
      and(
        isNotNull(certificados.emitidoAt),
        isNotNull(certificados.venceAt),
        inArray(expedientes.estado, ["FINALIZADO", "ENTREGADO", "ANULADO"]),
        filtro === "todos" ? undefined : ne(expedientes.estado, "ANULADO"),
        desde ? gte(certificados.venceAt, desde) : undefined,
        hasta ? lte(certificados.venceAt, hasta) : undefined,
        antesDe ? lt(certificados.venceAt, antesDe) : undefined,
      ),
    )
    .orderBy(filtro === "todos" ? desc(certificados.emitidoAt) : asc(certificados.venceAt))
    .limit(MAX_FILAS_CERTIFICADOS);

  return filas.flatMap((f) =>
    f.emitidoAt && f.venceAt && f.expedienteNumero
      ? [
          {
            expedienteId: f.expedienteId,
            expedienteNumero: f.expedienteNumero,
            numero: f.numero,
            nombreComercial: f.nombreComercial,
            distrito: f.distrito,
            emitidoAt: f.emitidoAt,
            venceAt: f.venceAt,
            diasRestantes: diasParaVencer(f.venceAt, ahora),
            estado: estadoCertificado({ venceAt: f.venceAt, revocado: f.estado === "ANULADO" }, ahora),
          },
        ]
      : [],
  );
}

export async function listCertificadosCliente(
  actor: Actor,
  ahora: Date = new Date(),
): Promise<CertificadoClienteFila[]> {
  if (actor.rol !== "cliente") throw new Error("No autorizado");

  const filas = await db
    .select({
      expedienteId: expedientes.id,
      numero: certificados.numero,
      nombreComercial: establecimientos.nombreComercial,
      emitidoAt: certificados.emitidoAt,
      venceAt: certificados.venceAt,
    })
    .from(certificados)
    .innerJoin(expedientes, eq(certificados.expedienteId, expedientes.id))
    .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
    .where(
      and(
        eq(expedientes.usuarioId, actor.id),
        eq(expedientes.estado, "ENTREGADO"),
        isNotNull(certificados.emitidoAt),
        isNotNull(certificados.venceAt),
      ),
    )
    .orderBy(desc(certificados.emitidoAt))
    .limit(MAX_FILAS_CERTIFICADOS);

  return filas.flatMap((f) =>
    f.emitidoAt && f.venceAt
      ? [
          {
            expedienteId: f.expedienteId,
            numero: f.numero,
            nombreComercial: f.nombreComercial,
            emitidoAt: f.emitidoAt,
            venceAt: f.venceAt,
            diasRestantes: diasParaVencer(f.venceAt, ahora),
            estado: estadoCertificado({ venceAt: f.venceAt, revocado: false }, ahora),
          },
        ]
      : [],
  );
}
