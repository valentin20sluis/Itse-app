import { and, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { db } from "@/db";
import { establecimientos, expedienteDocumentos, expedientes, historialEstados } from "@/db/schema";
import { getEstablecimientoById } from "@/modules/establecimientos/services/establecimiento.service";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import {
  declaracionSchema,
  paso1Schema,
  paso2Schema,
  paso3Schema,
  paso4Schema,
  type Paso1Input,
  type Paso2Input,
  type Paso3Input,
  type Paso4Input,
} from "@/modules/expedientes/schemas/solicitud.schema";
import type { Expediente, ExpedienteListItem } from "@/modules/expedientes/types/expediente.types";
import { documentosFaltantes } from "@/modules/expedientes/utils/documentos";

export type PatchBorrador = Paso1Input | Paso2Input | Paso3Input | Paso4Input;

export type EnviarResultado =
  | { status: "ok"; expediente: Expediente }
  | { status: "incompleto"; faltantes: string[] }
  | { status: "no_encontrado" };

const MAX_INTENTOS_NUMERO = 3;

function assertCliente(actor: Actor) {
  if (actor.rol !== "cliente") throw new Error("No autorizado");
}

export function getAnioLima(fecha: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric" }).format(fecha),
  );
}

export function formatNumeroExpediente(anio: number, n: number): string {
  return `EXP-${anio}-${String(n).padStart(5, "0")}`;
}

const ownBorrador = (actor: Actor, id: string) =>
  and(
    eq(expedientes.id, id),
    eq(expedientes.usuarioId, actor.id),
    eq(expedientes.estado, "BORRADOR"),
  );

function patchToValues(patch: PatchBorrador) {
  if ("establecimientoId" in patch) {
    return { establecimientoId: patch.establecimientoId, tipoTramite: patch.tipoTramite };
  }
  if ("nivelRiesgo" in patch) {
    return {
      nivelRiesgo: patch.nivelRiesgo,
      tieneSotano: patch.tieneSotano,
      almacenaInflamables: patch.almacenaInflamables,
    };
  }
  if ("solicitanteNombre" in patch) {
    return {
      solicitanteNombre: patch.solicitanteNombre,
      solicitanteDocumento: patch.solicitanteDocumento,
      solicitanteTelefono: patch.solicitanteTelefono,
      solicitanteEmail: patch.solicitanteEmail,
      esRepresentante: patch.esRepresentante,
      razonSocial: patch.esRepresentante ? (patch.razonSocial ?? null) : null,
    };
  }
  return { numeroBoleta: patch.numeroBoleta };
}

export async function createBorrador(actor: Actor, input: Paso1Input): Promise<Expediente | null> {
  assertCliente(actor);
  const est = await getEstablecimientoById(actor, input.establecimientoId);
  if (!est) return null;
  const [row] = await db
    .insert(expedientes)
    .values({
      usuarioId: actor.id,
      establecimientoId: est.id,
      tipoTramite: input.tipoTramite,
      estado: "BORRADOR",
    })
    .returning();
  return row;
}

export async function updateBorrador(
  actor: Actor,
  id: string,
  patch: PatchBorrador,
): Promise<Expediente | null> {
  assertCliente(actor);
  if ("establecimientoId" in patch && !(await getEstablecimientoById(actor, patch.establecimientoId))) {
    return null;
  }
  const [row] = await db
    .update(expedientes)
    .set({ ...patchToValues(patch), updatedAt: new Date() })
    .where(ownBorrador(actor, id))
    .returning();
  return row ?? null;
}

export async function getExpedienteById(actor: Actor, id: string): Promise<Expediente | null> {
  const where =
    actor.rol === "cliente"
      ? and(eq(expedientes.id, id), eq(expedientes.usuarioId, actor.id))
      : eq(expedientes.id, id);
  const [row] = await db.select().from(expedientes).where(where).limit(1);
  return row ?? null;
}

export async function listOwnExpedientes(actor: Actor): Promise<ExpedienteListItem[]> {
  assertCliente(actor);
  return db
    .select({
      ...getTableColumns(expedientes),
      establecimientoNombre: establecimientos.nombreComercial,
    })
    .from(expedientes)
    .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
    .where(eq(expedientes.usuarioId, actor.id))
    .orderBy(desc(expedientes.createdAt));
}

function codigoPg(e: unknown): unknown {
  const err = e as { code?: unknown; cause?: { code?: unknown } };
  return err?.code ?? err?.cause?.code;
}

export async function enviarExpediente(
  actor: Actor,
  id: string,
  declaracionAceptada: boolean,
): Promise<EnviarResultado> {
  assertCliente(actor);
  const [exp] = await db.select().from(expedientes).where(ownBorrador(actor, id)).limit(1);
  if (!exp) return { status: "no_encontrado" };

  const faltantes: string[] = [];
  const pasos = [
    paso1Schema.safeParse(exp),
    paso2Schema.safeParse(exp),
    paso3Schema.safeParse({ ...exp, razonSocial: exp.razonSocial ?? undefined }),
    paso4Schema.safeParse(exp),
  ];
  pasos.forEach((r, i) => {
    if (!r.success) faltantes.push(`paso${i + 1}`);
  });
  if (!declaracionSchema.safeParse({ aceptada: declaracionAceptada }).success) {
    faltantes.push("declaracion");
  }
  if (!(await getEstablecimientoById(actor, exp.establecimientoId))) {
    faltantes.push("establecimiento");
  }
  const subidos = await db
    .select({ tipo: expedienteDocumentos.tipo })
    .from(expedienteDocumentos)
    .where(eq(expedienteDocumentos.expedienteId, exp.id));
  faltantes.push(...documentosFaltantes(subidos.map((d) => d.tipo)));
  if (faltantes.length > 0) return { status: "incompleto", faltantes };

  const ahora = new Date();
  const anio = getAnioLima(ahora);
  for (let intento = 1; ; intento++) {
    try {
      // Correlativo max+1 del año dentro del UPDATE; el índice único detecta choques concurrentes.
      const [presentado] = await db
        .update(expedientes)
        .set({
          estado: "PRESENTADO",
          numero: sql<string>`(select 'EXP-' || ${String(anio)}::text || '-' || lpad((coalesce(max(substring(numero from 10)::int), 0) + 1)::text, 5, '0') from expedientes where numero like ${`EXP-${anio}-%`})`,
          presentadoAt: ahora,
          declaracionAceptadaAt: ahora,
          updatedAt: ahora,
        })
        .where(ownBorrador(actor, id))
        .returning();
      if (!presentado) return { status: "no_encontrado" };

      // Límite aceptado: neon-http no tiene transacciones; si este INSERT falla queda presentado sin historial.
      await db.insert(historialEstados).values({
        expedienteId: presentado.id,
        estadoAnterior: "BORRADOR",
        estadoNuevo: "PRESENTADO",
        usuarioId: actor.id,
        comentario: "Solicitud presentada",
      });
      return { status: "ok", expediente: presentado };
    } catch (e) {
      if (codigoPg(e) !== "23505" || intento >= MAX_INTENTOS_NUMERO) throw e;
    }
  }
}
