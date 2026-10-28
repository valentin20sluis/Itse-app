import { and, asc, count, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { certificados, establecimientos, expedientes, historialEstados } from "@/db/schema";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import { ESTADOS_ORDEN } from "@/modules/reportes/constants/estados-orden";
import type { FiltrosReporte } from "@/modules/reportes/schemas/filtros-reporte.schema";
import { contarCertificadosPorVencimiento } from "@/modules/reportes/services/certificados-vencimiento.service";
import type { Reporte } from "@/modules/reportes/types/reporte.types";
import { clavesMeses, rangoDesdeHasta, rellenarMeses } from "@/modules/reportes/utils/rango-fechas";

const MAX_DISTRITOS = 50;
const RIESGOS = ["BAJO", "MEDIO", "ALTO", "MUY_ALTO"] as const;
const TRAMITES = ["NUEVA", "RENOVACION"] as const;

const redondear = (n: number) => Math.round(n * 10) / 10;

// Cohorte: expedientes presentados en el rango que cumplen los filtros. Es la única condición compartida por todas las secciones y el CSV.
export function condicionCohorte(filtros: FiltrosReporte, ahora: Date = new Date()) {
  const rango = rangoDesdeHasta(filtros.desde, filtros.hasta, ahora);
  return {
    rango,
    where: and(
      isNotNull(expedientes.numero),
      gte(expedientes.presentadoAt, rango.desde),
      lt(expedientes.presentadoAt, rango.hastaExclusivo),
      filtros.estado ? eq(expedientes.estado, filtros.estado) : undefined,
      filtros.riesgo ? eq(expedientes.nivelRiesgo, filtros.riesgo) : undefined,
      filtros.distrito ? eq(establecimientos.distrito, filtros.distrito) : undefined,
    ),
  };
}

export async function getReporte(actor: Actor, filtros: FiltrosReporte, ahora: Date = new Date()): Promise<Reporte> {
  if (actor.rol === "cliente") throw new Error("No autorizado");

  const { rango, where } = condicionCohorte(filtros, ahora);

  const mes = sql<string>`to_char(${expedientes.presentadoAt} at time zone 'America/Lima', 'YYYY-MM')`;
  const contar = (estado: string) =>
    sql<number>`count(distinct ${historialEstados.expedienteId}) filter (where ${historialEstados.estadoNuevo} = ${estado})`.mapWith(Number);

  // Fin de cada paso = momento del cambio siguiente del mismo expediente (null si es el último).
  const pasos = db
    .select({
      estado: historialEstados.estadoNuevo,
      inicio: historialEstados.createdAt,
      fin: sql<Date | null>`lead(${historialEstados.createdAt}) over (partition by ${historialEstados.expedienteId} order by ${historialEstados.createdAt}, ${historialEstados.id})`.as(
        "fin",
      ),
    })
    .from(historialEstados)
    .innerJoin(expedientes, eq(historialEstados.expedienteId, expedientes.id))
    .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
    .where(where)
    .as("pasos");

  const [produccion, porRiesgo, porTramite, [resultados], tiempos, [entrega], [emitidos], distritos, vencimiento] =
    await Promise.all([
      db
        .select({ clave: mes, cantidad: count() })
        .from(expedientes)
        .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
        .where(where)
        .groupBy(mes),
      db
        .select({ riesgo: expedientes.nivelRiesgo, cantidad: count() })
        .from(expedientes)
        .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
        .where(where)
        .groupBy(expedientes.nivelRiesgo),
      db
        .select({ tramite: expedientes.tipoTramite, cantidad: count() })
        .from(expedientes)
        .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
        .where(where)
        .groupBy(expedientes.tipoTramite),
      db
        .select({ cumple: contar("CUMPLE"), noCumple: contar("NO_CUMPLE"), subsanacion: contar("EN_SUBSANACION") })
        .from(historialEstados)
        .innerJoin(expedientes, eq(historialEstados.expedienteId, expedientes.id))
        .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
        .where(where),
      db
        .select({
          estado: pasos.estado,
          promedio: sql<number>`avg(extract(epoch from (${pasos.fin} - ${pasos.inicio})) / 86400)`.mapWith(Number),
          cantidad: count(),
        })
        .from(pasos)
        .where(isNotNull(pasos.fin))
        .groupBy(pasos.estado),
      db
        .select({
          promedio: sql<number | null>`avg(extract(epoch from (${historialEstados.createdAt} - ${expedientes.presentadoAt})) / 86400)`,
        })
        .from(historialEstados)
        .innerJoin(expedientes, eq(historialEstados.expedienteId, expedientes.id))
        .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
        .where(and(where, eq(historialEstados.estadoNuevo, "ENTREGADO"))),
      db
        .select({ total: count() })
        .from(certificados)
        .innerJoin(expedientes, eq(certificados.expedienteId, expedientes.id))
        .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
        .where(
          and(
            gte(certificados.emitidoAt, rango.desde),
            lt(certificados.emitidoAt, rango.hastaExclusivo),
            filtros.riesgo ? eq(expedientes.nivelRiesgo, filtros.riesgo) : undefined,
            filtros.distrito ? eq(establecimientos.distrito, filtros.distrito) : undefined,
          ),
        ),
      db
        .selectDistinct({ distrito: establecimientos.distrito })
        .from(establecimientos)
        .orderBy(asc(establecimientos.distrito))
        .limit(MAX_DISTRITOS),
      contarCertificadosPorVencimiento(actor, { riesgo: filtros.riesgo, distrito: filtros.distrito }, ahora),
    ]);

  const riesgoPorNivel = new Map(porRiesgo.map((r) => [r.riesgo, Number(r.cantidad)]));
  const sinClasificar = riesgoPorNivel.get(null) ?? 0;
  const tramitePorTipo = new Map(porTramite.map((t) => [t.tramite, Number(t.cantidad)]));
  const tiempoPorEstado = new Map(tiempos.map((t) => [t.estado, t]));

  return {
    produccion: rellenarMeses(
      clavesMeses(rango.desde, rango.hastaExclusivo),
      produccion.map((p) => ({ clave: p.clave, cantidad: Number(p.cantidad) })),
    ),
    porRiesgo: [
      ...RIESGOS.map((riesgo) => ({ riesgo, cantidad: riesgoPorNivel.get(riesgo) ?? 0 })),
      ...(sinClasificar > 0 ? [{ riesgo: null, cantidad: sinClasificar }] : []),
    ],
    porTramite: TRAMITES.map((tramite) => ({ tramite, cantidad: tramitePorTipo.get(tramite) ?? 0 })),
    resultados: {
      cumple: resultados?.cumple ?? 0,
      noCumple: resultados?.noCumple ?? 0,
      subsanacion: resultados?.subsanacion ?? 0,
    },
    tiempos: ESTADOS_ORDEN.flatMap((estado) => {
      const t = tiempoPorEstado.get(estado);
      return t ? [{ estado, promedioDias: redondear(t.promedio), cantidad: Number(t.cantidad) }] : [];
    }),
    tiempoEntrega: entrega?.promedio == null ? null : redondear(Number(entrega.promedio)),
    certificados: { emitidos: Number(emitidos?.total ?? 0), vencimiento },
    distritos: distritos.map((d) => d.distrito),
  };
}
