import Link from "next/link";

import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EstadoBadge } from "@/modules/expedientes/components/EstadoBadge";
import { ExpedienteDatos } from "@/modules/expedientes/components/ExpedienteDatos";
import { InspeccionResumen } from "@/modules/inspecciones/components/InspeccionResumen";
import type { ResumenInspeccion } from "@/modules/inspecciones/services/designacion.service";
import { HistorialTimeline } from "@/modules/expedientes/components/HistorialTimeline";
import type { ExpedienteDetalle } from "@/modules/expedientes/types/bandeja.types";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";

export function ExpedienteDetalleCliente({
  detalle,
  inspeccion,
}: {
  detalle: ExpedienteDetalle;
  inspeccion: ResumenInspeccion;
}) {
  const { expediente: e, historial } = detalle;

  return (
    <div className="min-w-0">
      <Link
        href="/mi-cuenta/expedientes"
        className={buttonVariants({ variant: "ghost", className: "mb-2 h-11" })}
      >
        Volver a mis expedientes
      </Link>
      <PageHeader title={e.numero ?? "Expediente"} />
      <div className="-mt-4 mb-6 flex flex-wrap items-center gap-2">
        <EstadoBadge estado={e.estado} />
        {e.pagadoAt && (
          <>
            <Badge variant="secondary">Pagado</Badge>
            <span className="text-sm text-muted-foreground">Pagado el {formatFecha(e.pagadoAt)}</span>
          </>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <ExpedienteDatos detalle={detalle} />
        <InspeccionResumen total={inspeccion.total} />
        <Card>
          <CardHeader>
            <h2 className="font-heading text-base font-medium">Historial</h2>
          </CardHeader>
          <CardContent>
            <HistorialTimeline historial={historial} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
