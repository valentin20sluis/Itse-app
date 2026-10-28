import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { certificados, expedientes } from "@/db/schema";
import { certificadoDescargable } from "@/modules/certificados/utils/certificado-acceso";
import { generarCodigo } from "@/modules/certificados/utils/certificado-codigo";
import { estadoCertificado, type EstadoCertificado } from "@/modules/certificados/utils/vigencia";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import {
  codigoPg,
  getAnioLima,
  MAX_INTENTOS_NUMERO,
} from "@/modules/expedientes/services/expediente.service";
import { aplicar, type TransicionResultado } from "@/modules/expedientes/services/transicion.service";
import { puedeTransicionar } from "@/modules/expedientes/utils/transiciones";

export type ResumenCertificado = {
  numero: string;
  emitidoAt: Date | null;
  venceAt: Date | null;
  estado: EstadoCertificado | null;
};

export const COMENTARIO_GENERADO = "Certificado generado y enviado a Jefatura para su aprobación.";

function assertPersonal(actor: Actor) {
  if (actor.rol === "cliente") throw new Error("No autorizado");
}

// Correlativo del año dentro del INSERT (max + 1); el índice único detecta choques concurrentes.
function numeroSiguiente(anio: number) {
  return sql`(select lpad(n::text, greatest(4, length(n::text)), '0') || '-' || ${String(anio)}::text
    from (select coalesce(max(split_part(numero, '-', 1)::int), 0) + 1 as n
      from certificados where numero like ${`%-${anio}`}) t)`;
}

export async function prepararCertificado(
  actor: Actor,
  id: string,
  ahora: Date = new Date(),
): Promise<TransicionResultado> {
  assertPersonal(actor);
  const [exp] = await db
    .select({ estado: expedientes.estado, numero: expedientes.numero, nivelRiesgo: expedientes.nivelRiesgo })
    .from(expedientes)
    .where(eq(expedientes.id, id))
    .limit(1);
  if (!exp?.numero) return { status: "no_encontrado" };
  if (
    exp.estado !== "CUMPLE" ||
    !exp.nivelRiesgo ||
    !puedeTransicionar(exp.estado, "CERTIFICADO_PENDIENTE_FIRMA", actor.rol)
  ) {
    return { status: "no_permitido" };
  }
  const anio = getAnioLima(ahora);
  for (let intento = 1; ; intento++) {
    const codigo = generarCodigo();
    try {
      return await aplicar(
        actor,
        id,
        "CUMPLE",
        "CERTIFICADO_PENDIENTE_FIRMA",
        { estado: "CERTIFICADO_PENDIENTE_FIRMA" },
        undefined,
        COMENTARIO_GENERADO,
        (gano) => [
          db.insert(certificados).select(sql`
            select gen_random_uuid(), ${id}::uuid, ${numeroSiguiente(anio)}, ${codigo}::text,
              null::timestamptz, null::timestamptz, null::text, null::timestamptz, now()
            where ${gano}`),
        ],
      );
    } catch (e) {
      if (codigoPg(e) !== "23505" || intento >= MAX_INTENTOS_NUMERO) throw e;
    }
  }
}

export async function getResumenCertificado(
  actor: Actor,
  expedienteId: string,
  ahora: Date = new Date(),
): Promise<ResumenCertificado | null> {
  const [fila] = await db
    .select({
      numero: certificados.numero,
      emitidoAt: certificados.emitidoAt,
      venceAt: certificados.venceAt,
      estado: expedientes.estado,
      usuarioId: expedientes.usuarioId,
    })
    .from(certificados)
    .innerJoin(expedientes, eq(certificados.expedienteId, expedientes.id))
    .where(eq(certificados.expedienteId, expedienteId))
    .limit(1);
  if (!fila) return null;
  if (actor.rol === "cliente" && (fila.usuarioId !== actor.id || !certificadoDescargable("cliente", fila.estado))) {
    return null;
  }
  return {
    numero: fila.numero,
    emitidoAt: fila.emitidoAt,
    venceAt: fila.venceAt,
    estado:
      fila.emitidoAt && fila.venceAt
        ? estadoCertificado({ venceAt: fila.venceAt, revocado: fila.estado === "ANULADO" }, ahora)
        : null,
  };
}
