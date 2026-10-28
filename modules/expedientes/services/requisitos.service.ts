import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { establecimientos, expedienteDocumentos, expedientes } from "@/db/schema";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import { aplicar } from "@/modules/expedientes/services/transicion.service";
import type { TipoDocumento } from "@/modules/expedientes/types/expediente.types";
import { documentosFaltantes } from "@/modules/expedientes/utils/documentos";

export type ReenvioResultado =
  | { status: "ok" }
  | { status: "no_encontrado" }
  | { status: "no_permitido" }
  | { status: "incompleto"; faltantes: TipoDocumento[] }
  | { status: "conflicto" };

export const COMENTARIO_REENVIO = "Requisitos subsanados y reenviados.";

export async function reenviarRequisitos(actor: Actor, id: string): Promise<ReenvioResultado> {
  if (actor.rol !== "cliente") throw new Error("No autorizado");

  const [exp] = await db
    .select({
      estado: expedientes.estado,
      nivelRiesgo: expedientes.nivelRiesgo,
      calidadSolicitante: expedientes.calidadSolicitante,
      tieneCocina: expedientes.tieneCocina,
      esGrifo: expedientes.esGrifo,
      almacenaInflamables: expedientes.almacenaInflamables,
      numeroPisos: establecimientos.numeroPisos,
    })
    .from(expedientes)
    .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
    .where(and(eq(expedientes.id, id), eq(expedientes.usuarioId, actor.id)))
    .limit(1);
  if (!exp) return { status: "no_encontrado" };
  if (exp.estado !== "OBSERVADO_REQUISITOS") return { status: "no_permitido" };

  const subidos = await db
    .select({ tipo: expedienteDocumentos.tipo })
    .from(expedienteDocumentos)
    .where(eq(expedienteDocumentos.expedienteId, id));
  const faltantes = documentosFaltantes(
    subidos.map((d) => d.tipo),
    exp,
  );
  if (faltantes.length > 0) return { status: "incompleto", faltantes };

  const res = await aplicar(
    actor,
    id,
    "OBSERVADO_REQUISITOS",
    "PRESENTADO",
    { estado: "PRESENTADO" },
    eq(expedientes.usuarioId, actor.id),
    COMENTARIO_REENVIO,
  );
  return res.status === "ok" ? res : { status: "conflicto" };
}
