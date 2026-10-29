import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { expedientes, historialEstados } from "@/db/schema";
import { listCertificadosCliente } from "@/modules/certificados/services/certificado-lista.service";
import type { InicioCliente, PasoSiguiente } from "@/modules/client-area/types/inicio.types";
import { resumirInicio } from "@/modules/client-area/utils/resumen-inicio";
import { ordenarPasos, siguientePaso } from "@/modules/client-area/utils/siguiente-paso";
import { getFeriados } from "@/modules/configuracion/services/feriado-lectura.service";
import { listOwnEstablecimientos } from "@/modules/establecimientos/services/establecimiento.service";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import { listOwnExpedientes } from "@/modules/expedientes/services/expediente.service";
import { ultimaObservacion } from "@/modules/expedientes/utils/observacion";

// Una sola consulta para todos los observados; la unión con `expedientes` fija que sean del propio cliente.
async function motivosObservacion(actor: Actor, ids: string[]): Promise<Map<string, string | null>> {
  const filas = await db
    .select({
      id: historialEstados.id,
      expedienteId: historialEstados.expedienteId,
      estadoAnterior: historialEstados.estadoAnterior,
      estadoNuevo: historialEstados.estadoNuevo,
      comentario: historialEstados.comentario,
      createdAt: historialEstados.createdAt,
    })
    .from(historialEstados)
    .innerJoin(expedientes, eq(historialEstados.expedienteId, expedientes.id))
    .where(
      and(
        eq(expedientes.usuarioId, actor.id),
        inArray(historialEstados.expedienteId, ids),
        eq(historialEstados.estadoNuevo, "OBSERVADO_REQUISITOS"),
      ),
    );
  return new Map(
    ids.map((id) => [id, ultimaObservacion(filas.filter((f) => f.expedienteId === id))]),
  );
}

export async function getInicioCliente(actor: Actor, ahora: Date = new Date()): Promise<InicioCliente> {
  if (actor.rol !== "cliente") throw new Error("No autorizado");

  const [establecimientos, lista, certificados] = await Promise.all([
    listOwnEstablecimientos(actor),
    listOwnExpedientes(actor),
    listCertificadosCliente(actor, ahora),
  ]);

  const observados = lista.filter((e) => e.estado === "OBSERVADO_REQUISITOS").map((e) => e.id);
  const [motivos, feriados] = await Promise.all([
    observados.length > 0 ? motivosObservacion(actor, observados) : new Map<string, string | null>(),
    lista.some((e) => e.estado === "EN_SUBSANACION") ? getFeriados() : Promise.resolve<string[]>([]),
  ]);
  const direcciones = new Map(establecimientos.map((e) => [e.id, e.direccion]));

  const pasos = lista.flatMap((e) => {
    const paso: PasoSiguiente | null = siguientePaso(e, {
      motivo: motivos.get(e.id) ?? null,
      direccion: direcciones.get(e.establecimientoId) ?? null,
      feriados,
      ahora,
    });
    return paso ? [paso] : [];
  });

  return {
    pasos: ordenarPasos(pasos),
    ...resumirInicio({ establecimientos, expedientes: lista, certificados }),
  };
}
