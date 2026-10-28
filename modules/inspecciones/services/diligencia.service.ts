import { eq } from "drizzle-orm";
import { db } from "@/db";
import { expedientes } from "@/db/schema";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import { aplicar, type TransicionResultado } from "@/modules/expedientes/services/transicion.service";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";
import { puedeTransicionar } from "@/modules/expedientes/utils/transiciones";
import { validarProgramacion } from "@/modules/inspecciones/utils/fecha-diligencia";

export type DiligenciaResultado = TransicionResultado | { status: "fecha_invalida" };

export type ResultadoDiligencia = "CUMPLE" | "NO_CUMPLE";

function assertPersonal(actor: Actor) {
  if (actor.rol !== "admin" && actor.rol !== "superadmin") throw new Error("No autorizado");
}

async function leerEstado(id: string) {
  const [exp] = await db
    .select({ estado: expedientes.estado, numero: expedientes.numero })
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

export async function registrarResultadoDiligencia(
  actor: Actor,
  id: string,
  input: { resultado: ResultadoDiligencia; informe: string },
): Promise<DiligenciaResultado> {
  assertPersonal(actor);
  const exp = await leerEstado(id);
  if (!exp) return { status: "no_encontrado" };
  if (
    exp.estado !== "DILIGENCIA_PROGRAMADA" ||
    (input.resultado !== "CUMPLE" && input.resultado !== "NO_CUMPLE") ||
    !puedeTransicionar(exp.estado, input.resultado, actor.rol)
  ) {
    return { status: "no_permitido" };
  }
  const informe = input.informe.trim();
  if (informe.length < 10) return { status: "motivo_requerido" };
  return aplicar(
    actor,
    id,
    "DILIGENCIA_PROGRAMADA",
    input.resultado,
    { estado: input.resultado },
    undefined,
    informe,
  );
}
