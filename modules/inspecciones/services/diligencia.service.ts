import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { expedientes, observacionesDiligencia } from "@/db/schema";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import { getCatalogoActivo } from "@/modules/configuracion/services/catalogo-lectura.service";
import type { ObservacionCatalogo } from "@/modules/configuracion/types/configuracion.types";
import { getFeriados } from "@/modules/configuracion/services/feriado-lectura.service";
import { aplicar, type TransicionResultado } from "@/modules/expedientes/services/transicion.service";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";
import { tipoItsePorRiesgo } from "@/modules/expedientes/utils/riesgo";
import { puedeTransicionar } from "@/modules/expedientes/utils/transiciones";
import { validarProgramacion } from "@/modules/inspecciones/utils/fecha-diligencia";
import { evaluarObservaciones } from "@/modules/inspecciones/utils/observaciones";
import {
  calcularLimiteSubsanacion,
  validarReprogramacion,
  type TipoItse,
} from "@/modules/inspecciones/utils/plazo-subsanacion";

export type DiligenciaResultado =
  | TransicionResultado
  | { status: "fecha_invalida" }
  | { status: "observaciones_requeridas" }
  | { status: "observacion_invalida" }
  | { status: "observacion_relevante" }
  | { status: "reprogramacion_invalida" };

export type ResultadoDiligencia = "CUMPLE" | "NO_CUMPLE" | "EN_SUBSANACION";

const ETIQUETAS: Record<ResultadoDiligencia, string> = {
  CUMPLE: "Cumple",
  NO_CUMPLE: "No cumple",
  EN_SUBSANACION: "Observaciones subsanables",
};

export type ResultadoDiligenciaInput = {
  resultado: ResultadoDiligencia;
  codigos?: readonly string[];
  libres?: readonly string[];
  reprogramadaPara?: Date;
};

export type ResumenSubsanacion = {
  tipoItse: TipoItse | null;
  limite: Date | null;
  observaciones: { id: string; descripcion: string; esCatalogo: boolean }[];
};

function assertPersonal(actor: Actor) {
  if (actor.rol !== "admin" && actor.rol !== "superadmin") throw new Error("No autorizado");
}

async function leerEstado(id: string) {
  const [exp] = await db
    .select({
      estado: expedientes.estado,
      numero: expedientes.numero,
      nivelRiesgo: expedientes.nivelRiesgo,
    })
    .from(expedientes)
    .where(eq(expedientes.id, id))
    .limit(1);
  return exp?.numero ? exp : null;
}

export async function programarDiligencia(
  actor: Actor,
  id: string,
  fecha: Date,
  ahora: Date = new Date(),
): Promise<DiligenciaResultado> {
  assertPersonal(actor);
  const exp = await leerEstado(id);
  if (!exp) return { status: "no_encontrado" };
  if (exp.estado !== "INSPECTOR_DESIGNADO" || !puedeTransicionar(exp.estado, "DILIGENCIA_PROGRAMADA", actor.rol)) {
    return { status: "no_permitido" };
  }
  if (validarProgramacion(fecha, ahora) !== "ok") return { status: "fecha_invalida" };
  return aplicar(
    actor,
    id,
    "INSPECTOR_DESIGNADO",
    "DILIGENCIA_PROGRAMADA",
    { estado: "DILIGENCIA_PROGRAMADA", diligenciaProgramadaPara: fecha },
    undefined,
    `Diligencia programada para el ${formatFecha(fecha)}.`,
  );
}


type FilaObservacion = { codigo: string | null; descripcion: string };

function filasObservaciones(
  codigos: readonly string[],
  libres: readonly string[],
  catalogo: readonly ObservacionCatalogo[],
): FilaObservacion[] {
  return [
    ...codigos.flatMap((c) => {
      const o = catalogo.find((x) => x.codigo === c);
      return o ? [{ codigo: o.codigo, descripcion: o.descripcion }] : [];
    }),
    ...libres.map((l) => ({ codigo: null, descripcion: l })),
  ];
}

export async function registrarResultadoDiligencia(
  actor: Actor,
  id: string,
  input: ResultadoDiligenciaInput,
  ahora: Date = new Date(),
): Promise<DiligenciaResultado> {
  assertPersonal(actor);
  const exp = await leerEstado(id);
  if (!exp) return { status: "no_encontrado" };
  const { resultado } = input;
  const codigos = input.codigos ?? [];
  const libres = (input.libres ?? []).map((l) => l.trim()).filter(Boolean);
  const hayObservaciones = codigos.length > 0 || libres.length > 0;
  const tipo = exp.nivelRiesgo ? tipoItsePorRiesgo(exp.nivelRiesgo) : null;
  if (
    exp.estado !== "DILIGENCIA_PROGRAMADA" ||
    (resultado !== "CUMPLE" && resultado !== "NO_CUMPLE" && resultado !== "EN_SUBSANACION") ||
    !puedeTransicionar(exp.estado, resultado, actor.rol) ||
    (resultado === "EN_SUBSANACION" && !tipo) ||
    (resultado === "CUMPLE" && hayObservaciones)
  ) {
    return { status: "no_permitido" };
  }
  const catalogo = await getCatalogoActivo();
  const informe = `Resultado de la inspección: ${ETIQUETAS[resultado]}.`;

  if (resultado !== "EN_SUBSANACION") {
    // En "No cumple" las observaciones son opcionales y no se exige que sean no relevantes.
    if (hayObservaciones && !evaluarObservaciones("PREVIA", { codigos, libres }, catalogo).ok) {
      return { status: "observacion_invalida" };
    }
    return aplicar(
      actor,
      id,
      "DILIGENCIA_PROGRAMADA",
      resultado,
      { estado: resultado },
      undefined,
      informe,
      hayObservaciones ? (gano) => insertarObservaciones(id, filasObservaciones(codigos, libres, catalogo), gano) : undefined,
    );
  }

  const tipoItse = tipo as TipoItse;
  const evaluacion = evaluarObservaciones(tipoItse, { codigos, libres }, catalogo);
  if (!evaluacion.ok) {
    return {
      status: {
        sin_observaciones: "observaciones_requeridas",
        codigo_invalido: "observacion_invalida",
        relevante: "observacion_relevante",
      }[evaluacion.motivo],
    } as DiligenciaResultado;
  }
  const limite = calcularLimiteSubsanacion(tipoItse, ahora, await getFeriados());
  const reprogramada = input.reprogramadaPara;
  if (
    tipoItse === "PREVIA"
      ? !reprogramada || validarReprogramacion(reprogramada, limite, ahora) !== "ok"
      : reprogramada
  ) {
    return { status: "reprogramacion_invalida" };
  }
  const comentario =
    `${informe} Plazo para subsanar: hasta el ${formatFecha(limite)}.` +
    (reprogramada ? ` Nueva inspección: ${formatFecha(reprogramada)}.` : "");
  return aplicar(
    actor,
    id,
    "DILIGENCIA_PROGRAMADA",
    "EN_SUBSANACION",
    {
      estado: "EN_SUBSANACION",
      subsanacionLimite: limite,
      ...(reprogramada ? { diligenciaProgramadaPara: reprogramada } : {}),
    },
    undefined,
    comentario,
    (gano) => insertarObservaciones(id, filasObservaciones(codigos, libres, catalogo), gano),
  );
}

// clock_timestamp() (no now()) para que las filas de un mismo lote conserven su orden por created_at.
function insertarObservaciones(expedienteId: string, filas: FilaObservacion[], ganoUpdate: SQL) {
  return filas.map((f) =>
    db.insert(observacionesDiligencia).select(sql`
      select gen_random_uuid(), ${expedienteId}::uuid, ${f.codigo}::text, ${f.descripcion}::text, clock_timestamp()
      where ${ganoUpdate}`),
  );
}

export async function getResumenSubsanacion(
  actor: Actor,
  expedienteId: string,
): Promise<ResumenSubsanacion> {
  const vacio: ResumenSubsanacion = { tipoItse: null, limite: null, observaciones: [] };
  const [exp] = await db
    .select({ nivelRiesgo: expedientes.nivelRiesgo, limite: expedientes.subsanacionLimite })
    .from(expedientes)
    .where(
      and(
        eq(expedientes.id, expedienteId),
        actor.rol === "cliente" ? eq(expedientes.usuarioId, actor.id) : undefined,
      ),
    )
    .limit(1);
  if (!exp) return vacio;
  const filas = await db
    .select({
      id: observacionesDiligencia.id,
      descripcion: observacionesDiligencia.descripcion,
      codigo: observacionesDiligencia.codigo,
    })
    .from(observacionesDiligencia)
    .where(eq(observacionesDiligencia.expedienteId, expedienteId))
    .orderBy(asc(observacionesDiligencia.createdAt));
  return {
    tipoItse: exp.nivelRiesgo ? tipoItsePorRiesgo(exp.nivelRiesgo) : null,
    limite: exp.limite,
    observaciones: filas.map((f) => ({ id: f.id, descripcion: f.descripcion, esCatalogo: f.codigo !== null })),
  };
}
