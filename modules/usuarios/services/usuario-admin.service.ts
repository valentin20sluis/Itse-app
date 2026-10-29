import { and, asc, count, desc, eq, ilike, isNull, ne, or, type SQL } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { establecimientos, expedientes, usuarios, usuariosAuditoria } from "@/db/schema";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import type { UsuarioFiltros } from "@/modules/usuarios/schemas/usuario-filtros.schema";
import type {
  AuditoriaItem,
  UsuarioDetalle,
  UsuarioListItem,
  UsuariosPagina,
} from "@/modules/usuarios/types/usuario-admin.types";

export const POR_PAGINA = 10;
const AUDITORIA_MAX = 20;

function assertSuperadmin(actor: Actor) {
  if (actor.rol !== "superadmin") throw new Error("No autorizado");
}

type ConClerk = { nombres: string; apellidos: string; clerkId: string };

// Filas sin nombre (usuarios que no han vuelto a iniciar sesión): Clerk es la fuente.
// Si Clerk falla se devuelve lo que hay en BD. Nunca devuelve clerkId.
async function refrescarNombres<T extends ConClerk>(filas: T[]): Promise<Omit<T, "clerkId">[]> {
  const ids = filas.filter((f) => !f.nombres && !f.apellidos).map((f) => f.clerkId);
  const nuevos = new Map<string, { nombres: string; apellidos: string }>();

  if (ids.length > 0) {
    try {
      const client = await clerkClient();
      const { data } = await client.users.getUserList({ userId: ids, limit: POR_PAGINA });
      for (const u of data) {
        const nombres = u.firstName ?? "";
        const apellidos = u.lastName ?? "";
        if (!nombres && !apellidos) continue;
        await db.update(usuarios).set({ nombres, apellidos }).where(eq(usuarios.clerkId, u.id));
        nuevos.set(u.id, { nombres, apellidos });
      }
    } catch (error) {
      console.error("No se pudieron refrescar los nombres desde Clerk", error);
    }
  }

  return filas.map(({ clerkId, ...resto }) => ({ ...resto, ...nuevos.get(clerkId) }));
}

export function escapeLike(texto: string): string {
  return texto.replace(/[\\%_]/g, "\\$&");
}

function condiciones(f: UsuarioFiltros): SQL | undefined {
  const conds: (SQL | undefined)[] = [];
  if (f.q) {
    const patron = `%${escapeLike(f.q)}%`;
    conds.push(
      or(
        ilike(usuarios.nombres, patron),
        ilike(usuarios.apellidos, patron),
        ilike(usuarios.email, patron),
      ),
    );
  }
  if (f.rol) conds.push(eq(usuarios.rol, f.rol));
  if (f.estado) conds.push(eq(usuarios.activo, f.estado === "activo"));
  return and(...conds);
}

export async function listUsuarios(actor: Actor, filtros: UsuarioFiltros): Promise<UsuariosPagina> {
  assertSuperadmin(actor);
  const where = condiciones(filtros);

  const [{ total }] = await db.select({ total: count() }).from(usuarios).where(where);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Math.min(filtros.pagina, totalPaginas);

  const rows = await db
    .select({
      id: usuarios.id,
      clerkId: usuarios.clerkId,
      nombres: usuarios.nombres,
      apellidos: usuarios.apellidos,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
      createdAt: usuarios.createdAt,
    })
    .from(usuarios)
    .where(where)
    .orderBy(asc(usuarios.apellidos), asc(usuarios.nombres), asc(usuarios.id))
    .limit(POR_PAGINA)
    .offset((pagina - 1) * POR_PAGINA);

  const items: UsuarioListItem[] = (await refrescarNombres(rows)).map((r) => ({
    ...r,
    esActual: r.id === actor.id,
  }));
  return { items, total, pagina, totalPaginas };
}

export async function getUsuarioDetalle(actor: Actor, id: string): Promise<UsuarioDetalle | null> {
  assertSuperadmin(actor);

  const [fila] = await db
    .select({
      id: usuarios.id,
      clerkId: usuarios.clerkId,
      nombres: usuarios.nombres,
      apellidos: usuarios.apellidos,
      email: usuarios.email,
      documento: usuarios.documento,
      telefono: usuarios.telefono,
      rol: usuarios.rol,
      activo: usuarios.activo,
      createdAt: usuarios.createdAt,
    })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);
  if (!fila) return null;
  const [u] = await refrescarNombres([fila]);

  let expedientesPresentados: number | null = null;
  let establecimientosRegistrados: number | null = null;
  if (u.rol === "cliente") {
    const [exp] = await db
      .select({ n: count() })
      .from(expedientes)
      .where(and(eq(expedientes.usuarioId, id), ne(expedientes.estado, "BORRADOR")));
    const [est] = await db
      .select({ n: count() })
      .from(establecimientos)
      .where(and(eq(establecimientos.usuarioId, id), isNull(establecimientos.archivadoAt)));
    expedientesPresentados = exp.n;
    establecimientosRegistrados = est.n;
  }

  const autor = alias(usuarios, "autor");
  const filas = await db
    .select({
      id: usuariosAuditoria.id,
      accion: usuariosAuditoria.accion,
      valorAnterior: usuariosAuditoria.valorAnterior,
      valorNuevo: usuariosAuditoria.valorNuevo,
      createdAt: usuariosAuditoria.createdAt,
      autorNombres: autor.nombres,
      autorApellidos: autor.apellidos,
      autorEmail: autor.email,
    })
    .from(usuariosAuditoria)
    .innerJoin(autor, eq(autor.id, usuariosAuditoria.actorId))
    .where(eq(usuariosAuditoria.usuarioId, id))
    .orderBy(desc(usuariosAuditoria.createdAt))
    .limit(AUDITORIA_MAX);

  const auditoria: AuditoriaItem[] = filas.map((f) => ({
    id: f.id,
    accion: f.accion,
    valorAnterior: f.valorAnterior,
    valorNuevo: f.valorNuevo,
    createdAt: f.createdAt,
    actorNombre: `${f.autorNombres} ${f.autorApellidos}`.trim() || f.autorEmail,
  }));

  return {
    ...u,
    esActual: u.id === actor.id,
    expedientesPresentados,
    establecimientosRegistrados,
    auditoria,
  };
}
