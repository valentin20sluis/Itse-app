import { and, count, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { expedientes } from "@/db/schema";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import { ESTADOS_PENDIENTES_JEFATURA } from "@/modules/expedientes/services/bandeja.service";
import { aInputLima, parseFechaLima } from "@/modules/inspecciones/utils/fecha-diligencia";
import { ESTADOS_ORDEN, type EstadoExpediente } from "@/modules/reportes/constants/estados-orden";
import { contarCertificadosPorVencimiento } from "@/modules/reportes/services/certificados-vencimiento.service";
import type { DashboardPanel } from "@/modules/reportes/types/dashboard.types";
import { rellenarMeses, ultimosMeses } from "@/modules/reportes/utils/rango-fechas";

const DIA_MS = 86_400_000;
const DIAS_SEMANA = 7;
// Vence en 3 días o menos: antes del inicio de hoy + 4 días.
const DIAS_SUBSANACION = 4;
const MESES_GRAFICO = 6;

const contar = (condicion: ReturnType<typeof sql>) =>
  sql<number>`count(*) filter (where ${condicion})`.mapWith(Number);

export async function getDashboardPanel(actor: Actor, ahora: Date = new Date()): Promise<DashboardPanel> {
  if (actor.rol === "cliente") throw new Error("No autorizado");

  const hoy = parseFechaLima(aInputLima(ahora)) as Date;
  const enDias = (n: number) => new Date(hoy.getTime() + n * DIA_MS);
  const claves = ultimosMeses(MESES_GRAFICO, ahora);
  const inicioMeses = parseFechaLima(`${claves[0]}-01`) as Date;
  const presentado = isNotNull(expedientes.numero);
  const estado = expedientes.estado;
  const clave = sql<string>`to_char(${expedientes.presentadoAt} at time zone 'America/Lima', 'YYYY-MM')`;

  const [filasEstado, [conteos], filasMes, certificados] = await Promise.all([
    db.select({ estado, cantidad: count() }).from(expedientes).where(presentado).groupBy(estado),
    db
      .select({
        porRevisar: contar(sql`${estado} = 'PRESENTADO'`),
        enRevision: contar(sql`${estado} = 'EN_REVISION'`),
        pendientesJefatura: contar(sql`${inArray(estado, [...ESTADOS_PENDIENTES_JEFATURA])}`),
        inspeccionesSemana: contar(
          sql`${estado} = 'DILIGENCIA_PROGRAMADA' and ${expedientes.diligenciaProgramadaPara} >= ${hoy} and ${expedientes.diligenciaProgramadaPara} < ${enDias(DIAS_SEMANA)}`,
        ),
        subsanacionPorVencer: contar(
          sql`${estado} = 'EN_SUBSANACION' and ${expedientes.subsanacionLimite} < ${enDias(DIAS_SUBSANACION)}`,
        ),
      })
      .from(expedientes)
      .where(presentado),
    db
      .select({ clave, cantidad: count() })
      .from(expedientes)
      .where(and(presentado, gte(expedientes.presentadoAt, inicioMeses)))
      .groupBy(clave),
    contarCertificadosPorVencimiento(actor, {}, ahora),
  ]);

  const cantidades = new Map<EstadoExpediente, number>(filasEstado.map((f) => [f.estado, f.cantidad]));

  return {
    indicadores: {
      porRevisar: conteos?.porRevisar ?? 0,
      enRevision: conteos?.enRevision ?? 0,
      pendientesJefatura: conteos?.pendientesJefatura ?? 0,
      inspeccionesSemana: conteos?.inspeccionesSemana ?? 0,
      subsanacionPorVencer: conteos?.subsanacionPorVencer ?? 0,
      certificadosPorVencer: certificados.hasta30 + certificados.de31a60,
    },
    porEstado: ESTADOS_ORDEN.map((e) => ({ estado: e, cantidad: cantidades.get(e) ?? 0 })).filter(
      (f) => f.cantidad > 0,
    ),
    porMes: rellenarMeses(
      claves,
      filasMes.map((f) => ({ clave: f.clave, cantidad: f.cantidad })),
    ),
    certificados,
  };
}
