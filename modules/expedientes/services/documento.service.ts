import { and, eq, exists, gt, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { expedienteDocumentos, expedientes } from "@/db/schema";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import type { ExpedienteDocumento, TipoDocumento } from "@/modules/expedientes/types/expediente.types";
import { validateArchivo } from "@/modules/expedientes/utils/archivo";
import {
  ESTADOS_EDITABLES_CLIENTE,
  esDocumentoSubsanacion,
} from "@/modules/expedientes/utils/documentos";

export type RegisterDocumentoInput = {
  tipo: TipoDocumento;
  fileKey: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
};

export type RegisterDocumentoResult =
  | { status: "ok"; documento: ExpedienteDocumento; previousFileKey: string | null }
  | { status: "invalido"; error: string };

function assertCliente(actor: Actor) {
  if (actor.rol !== "cliente") throw new Error("No autorizado");
}

const DIA_MS = 86_400_000;

// Requisitos: solo en estados editables. Subsanación: solo en EN_SUBSANACION de ITSE posterior, sin
// presentar y dentro del plazo; el último día vale completo (subsanacion_limite + 1 día > ahora).
const ownEditable = (actor: Actor, expedienteId: string, tipo: TipoDocumento, ahora: Date) =>
  and(
    eq(expedientes.id, expedienteId),
    eq(expedientes.usuarioId, actor.id),
    esDocumentoSubsanacion(tipo)
      ? and(
          eq(expedientes.estado, "EN_SUBSANACION"),
          inArray(expedientes.nivelRiesgo, ["BAJO", "MEDIO"]),
          isNull(expedientes.subsanacionPresentadaAt),
          gt(expedientes.subsanacionLimite, new Date(ahora.getTime() - DIA_MS)),
        )
      : inArray(expedientes.estado, [...ESTADOS_EDITABLES_CLIENTE]),
  );

const visible = (actor: Actor, expedienteId: string) =>
  actor.rol === "cliente"
    ? and(eq(expedientes.id, expedienteId), eq(expedientes.usuarioId, actor.id))
    : eq(expedientes.id, expedienteId);

async function isVisible(actor: Actor, expedienteId: string) {
  const [row] = await db
    .select({ id: expedientes.id })
    .from(expedientes)
    .where(visible(actor, expedienteId))
    .limit(1);
  return Boolean(row);
}

const byTipo = (expedienteId: string, tipo: TipoDocumento) =>
  and(eq(expedienteDocumentos.expedienteId, expedienteId), eq(expedienteDocumentos.tipo, tipo));

export async function listDocumentos(
  actor: Actor,
  expedienteId: string,
): Promise<ExpedienteDocumento[]> {
  if (!(await isVisible(actor, expedienteId))) return [];
  return db
    .select()
    .from(expedienteDocumentos)
    .where(eq(expedienteDocumentos.expedienteId, expedienteId));
}

export async function getDocumentoForDownload(
  actor: Actor,
  expedienteId: string,
  tipo: TipoDocumento,
): Promise<ExpedienteDocumento | null> {
  if (!(await isVisible(actor, expedienteId))) return null;
  const [row] = await db
    .select()
    .from(expedienteDocumentos)
    .where(byTipo(expedienteId, tipo))
    .limit(1);
  return row ?? null;
}

export async function puedeSubirDocumento(
  actor: Actor,
  expedienteId: string,
  tipo: TipoDocumento,
  ahora: Date = new Date(),
): Promise<boolean> {
  assertCliente(actor);
  const [own] = await db
    .select({ id: expedientes.id })
    .from(expedientes)
    .where(ownEditable(actor, expedienteId, tipo, ahora))
    .limit(1);
  return Boolean(own);
}

export async function registerDocumento(
  actor: Actor,
  expedienteId: string,
  input: RegisterDocumentoInput,
  ahora: Date = new Date(),
): Promise<RegisterDocumentoResult | null> {
  if (!(await puedeSubirDocumento(actor, expedienteId, input.tipo, ahora))) return null;

  const check = validateArchivo({
    name: input.nombreOriginal,
    type: input.mimeType,
    size: input.tamanoBytes,
  });
  if (!check.ok) return { status: "invalido", error: check.error };

  const [previous] = await db
    .select({ fileKey: expedienteDocumentos.fileKey })
    .from(expedienteDocumentos)
    .where(byTipo(expedienteId, input.tipo))
    .limit(1);

  const values = {
    fileKey: input.fileKey,
    nombreOriginal: input.nombreOriginal,
    mimeType: input.mimeType,
    tamanoBytes: input.tamanoBytes,
  };
  const [documento] = await db
    .insert(expedienteDocumentos)
    .values({ expedienteId, tipo: input.tipo, ...values })
    .onConflictDoUpdate({
      target: [expedienteDocumentos.expedienteId, expedienteDocumentos.tipo],
      set: { ...values, createdAt: new Date() },
    })
    .returning();
  return { status: "ok", documento, previousFileKey: previous?.fileKey ?? null };
}

export async function removeDocumento(
  actor: Actor,
  expedienteId: string,
  tipo: TipoDocumento,
  ahora: Date = new Date(),
): Promise<ExpedienteDocumento | null> {
  assertCliente(actor);
  const [row] = await db
    .delete(expedienteDocumentos)
    .where(
      and(
        byTipo(expedienteId, tipo),
        exists(
          db
            .select({ id: expedientes.id })
            .from(expedientes)
            .where(
              and(ownEditable(actor, expedienteId, tipo, ahora), eq(expedientes.id, expedienteDocumentos.expedienteId)),
            ),
        ),
      ),
    )
    .returning();
  return row ?? null;
}
