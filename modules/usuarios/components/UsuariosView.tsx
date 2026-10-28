import Link from "next/link";
import { SearchX, Users } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";
import type { UsuarioFiltros } from "@/modules/usuarios/schemas/usuario-filtros.schema";
import { EstadoBadge, RolBadge } from "@/modules/usuarios/components/UsuarioBadges";
import { InvitarPersonalDialog } from "@/modules/usuarios/components/InvitarPersonalDialog";
import { UsuarioAcciones } from "@/modules/usuarios/components/UsuarioAcciones";
import { UsuariosFiltros } from "@/modules/usuarios/components/UsuariosFiltros";
import type { UsuarioListItem, UsuariosPagina } from "@/modules/usuarios/types/usuario-admin.types";

const nombreCompleto = (u: UsuarioListItem) =>
  [u.apellidos, u.nombres].filter(Boolean).join(", ") || u.email;

const accionesDe = (u: UsuarioListItem) => ({
  id: u.id,
  nombre: nombreCompleto(u),
  rol: u.rol,
  activo: u.activo,
  esActual: u.esActual,
});

function hrefPagina(filtros: UsuarioFiltros, pagina: number): string {
  const p = new URLSearchParams();
  if (filtros.q) p.set("q", filtros.q);
  if (filtros.rol) p.set("rol", filtros.rol);
  if (filtros.estado) p.set("estado", filtros.estado);
  if (pagina > 1) p.set("pagina", String(pagina));
  const qs = p.toString();
  return qs ? `/panel/usuarios?${qs}` : "/panel/usuarios";
}

function VerDetalle({ u }: { u: UsuarioListItem }) {
  return (
    <Link
      href={`/panel/usuarios/${u.id}`}
      aria-label={`Ver detalle de ${nombreCompleto(u)}`}
      className={buttonVariants({ variant: "outline", className: "h-11" })}
    >
      Ver detalle
    </Link>
  );
}

export function UsuariosView({
  datos,
  filtros,
}: {
  datos: UsuariosPagina;
  filtros: UsuarioFiltros;
}) {
  const { items, pagina, totalPaginas } = datos;
  const hayFiltros = Boolean(filtros.q || filtros.rol || filtros.estado);

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Usuarios"
          description="Personas que usan el sistema, con su rol y estado de cuenta."
        />
        <div className="mb-6 sm:shrink-0">
          <InvitarPersonalDialog />
        </div>
      </div>

      <UsuariosFiltros filtros={filtros} />

      {items.length === 0 ? (
        hayFiltros ? (
          <EmptyState
            icon={<SearchX />}
            title="No hay usuarios con esos filtros"
            description="Prueba con otro nombre o limpia los filtros."
          />
        ) : (
          <EmptyState
            icon={<Users />}
            title="Aún no hay usuarios"
            description="Los usuarios aparecen aquí cuando entran por primera vez al sistema."
          />
        )
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableCaption className="sr-only">Usuarios del sistema</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Nombre</TableHead>
                  <TableHead scope="col">Correo</TableHead>
                  <TableHead scope="col">Rol</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                  <TableHead scope="col">Alta</TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="whitespace-normal break-words font-medium">
                      {nombreCompleto(u)}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">{u.email}</TableCell>
                    <TableCell className="whitespace-normal">
                      <RolBadge rol={u.rol} />
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <EstadoBadge activo={u.activo} />
                    </TableCell>
                    <TableCell className="whitespace-normal">{formatFecha(u.createdAt)}</TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="flex flex-col items-start gap-2">
                        <VerDetalle u={u} />
                        <UsuarioAcciones usuario={accionesDe(u)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 gap-4 md:hidden">
            {items.map((u) => (
              <Card key={u.id}>
                <CardHeader>
                  <CardTitle className="break-words">{nombreCompleto(u)}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Correo</dt>
                    <dd className="min-w-0 break-words">{u.email}</dd>
                    <dt className="text-muted-foreground">Rol</dt>
                    <dd>
                      <RolBadge rol={u.rol} />
                    </dd>
                    <dt className="text-muted-foreground">Estado</dt>
                    <dd>
                      <EstadoBadge activo={u.activo} />
                    </dd>
                    <dt className="text-muted-foreground">Alta</dt>
                    <dd>{formatFecha(u.createdAt)}</dd>
                  </dl>
                  <div className="flex flex-col items-start gap-2">
                    <VerDetalle u={u} />
                    <UsuarioAcciones usuario={accionesDe(u)} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <nav
            aria-label="Paginación"
            className="mt-6 flex flex-wrap items-center justify-between gap-3"
          >
            <p className="text-sm text-muted-foreground">
              Página {pagina} de {totalPaginas}
            </p>
            <div className="flex gap-2">
              {pagina > 1 && (
                <Link
                  href={hrefPagina(filtros, pagina - 1)}
                  className={buttonVariants({ variant: "outline", className: "h-11" })}
                >
                  Anterior
                </Link>
              )}
              {pagina < totalPaginas && (
                <Link
                  href={hrefPagina(filtros, pagina + 1)}
                  className={buttonVariants({ variant: "outline", className: "h-11" })}
                >
                  Siguiente
                </Link>
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
