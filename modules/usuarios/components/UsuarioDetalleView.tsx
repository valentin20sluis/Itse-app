import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFecha, formatFechaHora } from "@/modules/expedientes/utils/format-fecha";
import { UsuarioAcciones } from "@/modules/usuarios/components/UsuarioAcciones";
import { EstadoBadge, RolBadge } from "@/modules/usuarios/components/UsuarioBadges";
import type { UsuarioDetalle } from "@/modules/usuarios/types/usuario-admin.types";
import { describirCambio } from "@/modules/usuarios/utils/auditoria-texto";

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

export function UsuarioDetalleView({
  usuario: u,
}: {
  usuario: UsuarioDetalle;
}) {
  const nombre = [u.nombres, u.apellidos].filter(Boolean).join(" ") || u.email;

  return (
    <div className="min-w-0">
      <Link
        href="/panel/usuarios"
        className={buttonVariants({ variant: "outline", className: "mb-4 h-11" })}
      >
        <ArrowLeft data-icon="inline-start" />
        Volver a usuarios
      </Link>
      <PageHeader title={nombre} description="Datos de la cuenta y cambios realizados sobre ella." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la cuenta</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
              <Dato etiqueta="Nombre">{nombre}</Dato>
              <Dato etiqueta="Correo">{u.email}</Dato>
              <Dato etiqueta="Documento">{u.documento || "—"}</Dato>
              <Dato etiqueta="Teléfono">{u.telefono || "—"}</Dato>
              <Dato etiqueta="Rol">
                <RolBadge rol={u.rol} />
              </Dato>
              <Dato etiqueta="Estado">
                <EstadoBadge activo={u.activo} />
              </Dato>
              <Dato etiqueta="Fecha de alta">{formatFecha(u.createdAt)}</Dato>
              {u.expedientesPresentados !== null && (
                <Dato etiqueta="Expedientes presentados">{u.expedientesPresentados}</Dato>
              )}
              {u.establecimientosRegistrados !== null && (
                <Dato etiqueta="Establecimientos registrados">{u.establecimientosRegistrados}</Dato>
              )}
            </dl>
            <UsuarioAcciones
              usuario={{ id: u.id, nombre, rol: u.rol, activo: u.activo, esActual: u.esActual }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cambios en la cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            {u.auditoria.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin cambios registrados</p>
            ) : (
              <ul className="flex flex-col gap-3 text-sm">
                {u.auditoria.map((a) => (
                  <li key={a.id} className="flex flex-col gap-0.5 border-b border-border pb-3 last:border-0 last:pb-0">
                    <span className="font-medium">{describirCambio(a)}</span>
                    <span className="break-words text-muted-foreground">
                      {a.actorNombre} · {formatFechaHora(a.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
