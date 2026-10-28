import { clerkClient } from "@clerk/nextjs/server";
import { and, count, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { usuarios, usuariosAuditoria } from "@/db/schema";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import type { Role } from "@/modules/usuarios/types/user.types";
import {
  evaluarCambioEstado,
  evaluarCambioRol,
} from "@/modules/usuarios/utils/guardas-usuarios";

type Cambio = { id: string; rol: Role; activo: boolean };
export type GestionResult = { ok: true; data: Cambio } | { ok: false; error: string };

const NO_ENCONTRADO = "No se encontró el usuario.";
const CONFLICTO = "Otra persona hizo un cambio al mismo tiempo. Actualiza la página e inténtalo de nuevo.";
const ERROR_GENERICO = "No se pudo guardar el cambio. Inténtalo de nuevo.";
const ERROR_CLERK = "No se pudo actualizar el rol. Inténtalo de nuevo.";
const ERROR_PARCIAL = "El cambio no se completó del todo. Revisa el rol del usuario.";

function assertSuperadmin(actor: Actor) {
  if (actor.rol !== "superadmin") throw new Error("No autorizado");
}

async function leerDestino(id: string) {
  const [u] = await db
    .select({ id: usuarios.id, clerkId: usuarios.clerkId, rol: usuarios.rol, activo: usuarios.activo })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);
  return u ?? null;
}

async function contarSuperadminsActivos(): Promise<number> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(usuarios)
    .where(and(eq(usuarios.rol, "superadmin"), eq(usuarios.activo, true)));
  return n;
}

// Carrera de dos superadmins: si A degrada a B y B a A a la vez, cada UPDATE toca una fila
// distinta y sin bloqueo ambos verían a los dos activos y pasarían (0 jefes). El `for update`
// bloquea todas las filas de jefes activos: la segunda sentencia espera al commit de la primera,
// re-evalúa y cuenta de nuevo. Debe ir en la subconsulta anidada, no junto al agregado.
const quedaOtroJefeActivo = sql`(select count(*) from (select ${usuarios.id} from ${usuarios} where ${and(
  eq(usuarios.rol, "superadmin"),
  eq(usuarios.activo, true),
)} for update) s) > 1`;

async function setRolClerk(clerkId: string, role: Role) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkId, { publicMetadata: { role } });
}

async function registrarAuditoria(fila: typeof usuariosAuditoria.$inferInsert) {
  try {
    await db.insert(usuariosAuditoria).values(fila);
  } catch {
    console.error("No se pudo registrar la auditoría del usuario");
  }
}

export async function cambiarRol(actor: Actor, id: string, nuevoRol: Role): Promise<GestionResult> {
  assertSuperadmin(actor);

  const destino = await leerDestino(id);
  if (!destino) return { ok: false, error: NO_ENCONTRADO };

  const guarda = evaluarCambioRol({
    actorId: actor.id,
    destino,
    nuevoRol,
    superadminsActivos: await contarSuperadminsActivos(),
  });
  if (!guarda.ok) return guarda;

  try {
    await setRolClerk(destino.clerkId, nuevoRol);
  } catch {
    return { ok: false, error: ERROR_CLERK };
  }

  const condiciones: (SQL | undefined)[] = [eq(usuarios.id, id), eq(usuarios.rol, destino.rol)];
  if (destino.rol === "superadmin" && destino.activo) condiciones.push(quedaOtroJefeActivo);

  let filas = 0;
  let fallo = false;
  try {
    const r = await db
      .update(usuarios)
      .set({ rol: nuevoRol, updatedAt: new Date() })
      .where(and(...condiciones))
      .returning({ id: usuarios.id });
    filas = r.length;
  } catch {
    fallo = true;
  }

  if (filas === 0) {
    try {
      await setRolClerk(destino.clerkId, destino.rol);
    } catch {
      return { ok: false, error: ERROR_PARCIAL };
    }
    return { ok: false, error: fallo ? ERROR_GENERICO : CONFLICTO };
  }

  await registrarAuditoria({
    usuarioId: id,
    actorId: actor.id,
    accion: "CAMBIO_ROL",
    valorAnterior: destino.rol,
    valorNuevo: nuevoRol,
  });
  return { ok: true, data: { id, rol: nuevoRol, activo: destino.activo } };
}

export async function setActivo(actor: Actor, id: string, activo: boolean): Promise<GestionResult> {
  assertSuperadmin(actor);

  const destino = await leerDestino(id);
  if (!destino) return { ok: false, error: NO_ENCONTRADO };

  const guarda = evaluarCambioEstado({
    actorId: actor.id,
    destino,
    nuevoActivo: activo,
    superadminsActivos: await contarSuperadminsActivos(),
  });
  if (!guarda.ok) return guarda;

  const condiciones: (SQL | undefined)[] = [
    eq(usuarios.id, id),
    eq(usuarios.activo, destino.activo),
    eq(usuarios.rol, destino.rol),
  ];
  if (!activo && destino.rol === "superadmin") condiciones.push(quedaOtroJefeActivo);

  let filas = 0;
  try {
    const r = await db
      .update(usuarios)
      .set({ activo, updatedAt: new Date() })
      .where(and(...condiciones))
      .returning({ id: usuarios.id });
    filas = r.length;
  } catch {
    return { ok: false, error: ERROR_GENERICO };
  }
  if (filas === 0) return { ok: false, error: CONFLICTO };

  await registrarAuditoria({
    usuarioId: id,
    actorId: actor.id,
    accion: activo ? "ACTIVACION" : "DESACTIVACION",
    valorAnterior: destino.activo ? "activo" : "inactivo",
    valorNuevo: activo ? "activo" : "inactivo",
  });
  return { ok: true, data: { id, rol: destino.rol, activo } };
}
