import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { EstadoBadge } from "@/modules/expedientes/components/EstadoBadge";
import type { ExpedienteListItem, TipoTramite } from "@/modules/expedientes/types/expediente.types";

const NUEVA_SOLICITUD = "/mi-cuenta/nueva-solicitud";

const TIPO_TRAMITE_LABELS: Record<TipoTramite, string> = {
  NUEVA: "Nueva inspección",
  RENOVACION: "Renovación",
};

const fechaFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Lima",
});

function nuevaSolicitudButton() {
  return (
    <Link href={NUEVA_SOLICITUD} className={buttonVariants({ className: "h-11" })}>
      <Plus data-icon="inline-start" />
      Nueva solicitud
    </Link>
  );
}

function ExpedienteCard({ expediente: e }: { expediente: ExpedienteListItem }) {
  const esBorrador = e.estado === "BORRADOR";
  const fecha = esBorrador ? e.updatedAt : (e.presentadoAt ?? e.createdAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="break-words">{e.numero ?? "Sin número"}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Establecimiento</dt>
          <dd className="break-words">{e.establecimientoNombre}</dd>
          <dt className="text-muted-foreground">Trámite</dt>
          <dd>{TIPO_TRAMITE_LABELS[e.tipoTramite]}</dd>
          <dt className="text-muted-foreground">Estado</dt>
          <dd>
            <EstadoBadge estado={e.estado} />
          </dd>
          <dt className="text-muted-foreground">{esBorrador ? "Actualizado" : "Presentado"}</dt>
          <dd>{fechaFormatter.format(fecha)}</dd>
        </dl>
      </CardContent>
      {esBorrador && (
        <CardFooter>
          <Link
            href={`${NUEVA_SOLICITUD}?borrador=${e.id}`}
            className={buttonVariants({ variant: "outline", className: "h-11 flex-1" })}
            aria-label={`Continuar solicitud de ${e.establecimientoNombre}`}
          >
            Continuar
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}

export function ExpedientesView({ expedientes }: { expedientes: ExpedienteListItem[] }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Mis expedientes"
          description="Consulta el estado de tus solicitudes de inspección técnica de seguridad."
        />
        {expedientes.length > 0 && <div className="mb-6 sm:shrink-0">{nuevaSolicitudButton()}</div>}
      </div>

      {expedientes.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="Aún no tienes solicitudes"
          description="Crea tu primera solicitud para iniciar el trámite."
          action={nuevaSolicitudButton()}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {expedientes.map((e) => (
            <ExpedienteCard key={e.id} expediente={e} />
          ))}
        </div>
      )}
    </div>
  );
}
