import { and, eq, gt, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { expedienteDocumentos, expedientes } from "@/db/schema";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import { getFeriados } from "@/modules/configuracion/services/feriado-lectura.service";
import { aplicar, type TransicionResultado } from "@/modules/expedientes/services/transicion.service";
import { DOCUMENTOS_SUBSANACION } from "@/modules/expedientes/utils/documentos";
import { tipoItsePorRiesgo } from "@/modules/expedientes/utils/riesgo";
import { puedeTransicionar } from "@/modules/expedientes/utils/transiciones";
import { estadoPlazo } from "@/modules/inspecciones/utils/dias-habiles";
import {
  opcionesEvaluacion,
  type OpcionEvaluacion,
} from "@/modules/inspecciones/utils/subsanacion";

export type SubsanacionResultado =
  | TransicionResultado
  | { status: "vencido" }
  | { status: "incompleto" }
  | { status: "sin_evidencia" }
  | { status: "plazo_vencido" };

const DIA_MS = 86_400_000;

const ETIQUETAS: Record<OpcionEvaluacion, string> = {
  CUMPLE: "Cumple",
  SIGUE_EN_SUBSANACION: "Sigue en subsanación",
  NO_CUMPLE: "No cumple",
};

function assertCliente(actor: Actor) {
  if (actor.rol !== "cliente") throw new Error("No autorizado");
}

function assertPersonal(actor: Actor) {
  if (actor.rol !== "admin" && actor.rol !== "superadmin") throw new Error("No autorizado");
}

async function leer(id: string, dueno?: string) {
  const [exp] = await db
    .select({
      estado: expedientes.estado,
      numero: expedientes.numero,
      nivelRiesgo: expedientes.nivelRiesgo,
      limite: expedientes.subsanacionLimite,
      presentadaAt: expedientes.subsanacionPresentadaAt,
    })
    .from(expedientes)
    .where(and(eq(expedientes.id, id), dueno ? eq(expedientes.usuarioId, dueno) : undefined))
    .limit(1);
  return exp?.numero ? exp : null;
}

// El último día del plazo vale completo: el límite es el inicio de ese día en Lima.
const plazoVigente = (ahora: Date) =>
  gt(expedientes.subsanacionLimite, new Date(ahora.getTime() - DIA_MS));

export async function presentarSubsanacion(
  actor: Actor,
  id: string,
  ahora: Date = new Date(),
): Promise<SubsanacionResultado> {
  assertCliente(actor);
  const exp = await leer(id, actor.id);
  if (!exp) return { status: "no_encontrado" };
  if (
    exp.estado !== "EN_SUBSANACION" ||
    !exp.nivelRiesgo ||
    tipoItsePorRiesgo(exp.nivelRiesgo) !== "POSTERIOR" ||
    exp.presentadaAt ||
    !exp.limite
  ) {
    return { status: "no_permitido" };
  }
  if (estadoPlazo(exp.limite, ahora, await getFeriados()).vencido) return { status: "vencido" };
  const subidos = await db
    .select({ tipo: expedienteDocumentos.tipo })
    .from(expedienteDocumentos)
    .where(
      and(
        eq(expedienteDocumentos.expedienteId, id),
        inArray(expedienteDocumentos.tipo, DOCUMENTOS_SUBSANACION.map((d) => d.tipo)),
      ),
    );
  if (subidos.length < DOCUMENTOS_SUBSANACION.length) return { status: "incompleto" };
  return aplicar(
    actor,
    id,
    "EN_SUBSANACION",
    "EN_SUBSANACION",
    { subsanacionPresentadaAt: ahora },
    and(isNull(expedientes.subsanacionPresentadaAt), plazoVigente(ahora)),
    "Subsanación presentada por el solicitante.",
  );
}

export async function evaluarSubsanacion(
  actor: Actor,
  id: string,
  input: { resultado: OpcionEvaluacion },
  ahora: Date = new Date(),
): Promise<SubsanacionResultado> {
  assertPersonal(actor);
  const exp = await leer(id);
  if (!exp) return { status: "no_encontrado" };
  const { resultado } = input;
  const tipoItse = exp.nivelRiesgo ? tipoItsePorRiesgo(exp.nivelRiesgo) : null;
  const destino = resultado === "SIGUE_EN_SUBSANACION" ? null : resultado;
  if (
    exp.estado !== "EN_SUBSANACION" ||
    !tipoItse ||
    !["CUMPLE", "NO_CUMPLE", "SIGUE_EN_SUBSANACION"].includes(resultado) ||
    (resultado === "SIGUE_EN_SUBSANACION" && tipoItse === "PREVIA") ||
    (destino && !puedeTransicionar(exp.estado, destino, actor.rol))
  ) {
    return { status: "no_permitido" };
  }
  const informe = `Evaluación de la subsanación: ${ETIQUETAS[resultado]}.`;

  const presentada = exp.presentadaAt !== null;
  const vencido = exp.limite ? estadoPlazo(exp.limite, ahora, await getFeriados()).vencido : true;
  if (!opcionesEvaluacion({ tipoItse, presentada, vencido }).includes(resultado)) {
    return { status: presentada ? "plazo_vencido" : "sin_evidencia" };
  }
  if (destino) {
    return aplicar(actor, id, "EN_SUBSANACION", destino, { estado: destino }, undefined, informe);
  }
  return aplicar(
    actor,
    id,
    "EN_SUBSANACION",
    "EN_SUBSANACION",
    { subsanacionPresentadaAt: null },
    and(isNotNull(expedientes.subsanacionPresentadaAt), plazoVigente(ahora)),
    informe,
  );
}
