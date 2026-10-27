import { and, desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { establecimientos, expedienteDocumentos, expedientes, historialEstados } from "@/db/schema";
import { getEstablecimientoById } from "@/modules/establecimientos/services/establecimiento.service";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import {
  declaracionSchema,
  type Paso1Input,
  type Paso2Input,
  type Paso3Input,
} from "@/modules/expedientes/schemas/solicitud.schema";
import type {
  Expediente,
  ExpedienteListItem,
  TipoDocumento,
} from "@/modules/expedientes/types/expediente.types";
import { faltantesBorrador } from "@/modules/expedientes/utils/completitud";

export type PatchBorrador = Paso1Input | Paso2Input | Paso3Input;

export type PrepararPagoResultado =
  | { status: "ok"; expediente: Expediente }
  | { status: "incompleto"; faltantes: string[] }
  | { status: "no_encontrado" };

export type PresentarResultado =
  | { status: "ok"; expediente: Expediente }
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
      tieneCocina: patch.tieneCocina,
      esGrifo: patch.esGrifo,
      usoMixtoPatrimonio: patch.usoMixtoPatrimonio,
      granEscala: patch.granEscala,
    };
  }
  return {
    solicitanteNombre: patch.solicitanteNombre,
    solicitanteDocumento: patch.solicitanteDocumento,
    solicitanteTelefono: patch.solicitanteTelefono,
    solicitanteEmail: patch.solicitanteEmail,
  };
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
  const filas = await db
    .select({
      ...getTableColumns(expedientes),
      establecimientoNombre: establecimientos.nombreComercial,
      numeroPisos: establecimientos.numeroPisos,
    })
    .from(expedientes)
    .innerJoin(establecimientos, eq(expedientes.establecimientoId, establecimientos.id))
    .where(eq(expedientes.usuarioId, actor.id))
    .orderBy(desc(expedientes.createdAt));

  const borradorIds = filas.filter((f) => f.estado === "BORRADOR").map((f) => f.id);
  const tiposPorExpediente = new Map<string, TipoDocumento[]>();
  if (borradorIds.length > 0) {
    const docs = await db
      .select({ expedienteId: expedienteDocumentos.expedienteId, tipo: expedienteDocumentos.tipo })
      .from(expedienteDocumentos)
      .where(inArray(expedienteDocumentos.expedienteId, borradorIds));
    for (const d of docs) {
      const tipos = tiposPorExpediente.get(d.expedienteId) ?? [];
      tipos.push(d.tipo);
      tiposPorExpediente.set(d.expedienteId, tipos);
    }
  }
  return filas.map(({ numeroPisos, ...f }) => ({
    ...f,
    pagoPendiente:
      f.estado === "BORRADOR" &&
      faltantesBorrador({ ...f, numeroPisos }, tiposPorExpediente.get(f.id) ?? []).length === 0,
  }));
}

function codigoPg(e: unknown): unknown {
  const err = e as { code?: unknown; cause?: { code?: unknown } };
  return err?.code ?? err?.cause?.code;
}

export async function prepararPago(
  actor: Actor,
  id: string,
  declaracionAceptada: boolean,
): Promise<PrepararPagoResultado> {
  assertCliente(actor);
  const [exp] = await db.select().from(expedientes).where(ownBorrador(actor, id)).limit(1);
  if (!exp) return { status: "no_encontrado" };

  const subidos = await db
    .select({ tipo: expedienteDocumentos.tipo })
    .from(expedienteDocumentos)
    .where(eq(expedienteDocumentos.expedienteId, exp.id));
  const establecimiento = await getEstablecimientoById(actor, exp.establecimientoId);
  const faltantes = faltantesBorrador(
    { ...exp, numeroPisos: establecimiento?.numeroPisos ?? 1 },
    subidos.map((d) => d.tipo),
  );
  if (!declaracionSchema.safeParse({ aceptada: declaracionAceptada }).success) {
    faltantes.push("declaracion");
  }
  if (!establecimiento) {
    faltantes.push("establecimiento");
  }
  if (faltantes.length > 0) return { status: "incompleto", faltantes };

  const ahora = new Date();
  const [row] = await db
    .update(expedientes)
    .set({ declaracionAceptadaAt: ahora, updatedAt: ahora })
    .where(ownBorrador(actor, id))
    .returning();
  if (!row) return { status: "no_encontrado" };
  return { status: "ok", expediente: row };
}

export async function guardarSesionPago(
  actor: Actor,
  id: string,
  stripeSessionId: string,
): Promise<boolean> {
  assertCliente(actor);
  const rows = await db
    .update(expedientes)
    .set({ stripeSessionId, updatedAt: new Date() })
    .where(ownBorrador(actor, id))
    .returning({ id: expedientes.id });
  return rows.length > 0;
}

export async function presentarExpediente(
  actor: Actor,
  id: string,
  pago: { stripeSessionId: string; pagadoAt: Date },
): Promise<PresentarResultado> {
  assertCliente(actor);
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
          stripeSessionId: pago.stripeSessionId,
          pagadoAt: pago.pagadoAt,
          presentadoAt: ahora,
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
        comentario: "Solicitud presentada con pago en línea",
      });
      return { status: "ok", expediente: presentado };
    } catch (e) {
      if (codigoPg(e) !== "23505" || intento >= MAX_INTENTOS_NUMERO) throw e;
    }
  }
}
