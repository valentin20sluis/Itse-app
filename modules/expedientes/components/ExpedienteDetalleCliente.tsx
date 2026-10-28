import Link from "next/link";

import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CertificadoCliente } from "@/modules/certificados/components/CertificadoCliente";
import { ResolucionNoCumpleCliente } from "@/modules/certificados/components/ResolucionNoCumpleCliente";
import type { ResumenCertificado } from "@/modules/certificados/services/certificado.service";
import { EstadoBadge } from "@/modules/expedientes/components/EstadoBadge";
import { ExpedienteDatos } from "@/modules/expedientes/components/ExpedienteDatos";
import { SubsanacionRequisitos } from "@/modules/expedientes/components/SubsanacionRequisitos";
import { InspeccionResumen } from "@/modules/inspecciones/components/InspeccionResumen";
import { ObservacionesLista } from "@/modules/inspecciones/components/ObservacionesLista";
import { PlazoSubsanacion } from "@/modules/inspecciones/components/PlazoSubsanacion";
import { SubsanacionCliente } from "@/modules/inspecciones/components/SubsanacionCliente";
import { estadoPlazo } from "@/modules/inspecciones/utils/dias-habiles";
import { puedeSubirEvidencia } from "@/modules/inspecciones/utils/subsanacion";
import type { ResumenInspeccion } from "@/modules/inspecciones/services/designacion.service";
import type { ResumenSubsanacion } from "@/modules/inspecciones/services/diligencia.service";
import { HistorialTimeline } from "@/modules/expedientes/components/HistorialTimeline";
import type { ExpedienteDetalle } from "@/modules/expedientes/types/bandeja.types";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";

export function ExpedienteDetalleCliente({
  detalle,
  inspeccion,
  subsanacion,
  certificado = null,
  resolucionNoCumple = null,
}: {
  detalle: ExpedienteDetalle;
  inspeccion: ResumenInspeccion;
  subsanacion: ResumenSubsanacion;
  certificado?: ResumenCertificado | null;
  resolucionNoCumple?: { resolucionAt: Date } | null;
}) {
  const { expediente: e, historial } = detalle;
  const vencido = subsanacion.limite ? estadoPlazo(subsanacion.limite, new Date()).vencido : true;
  const presentadaAt = e.subsanacionPresentadaAt;

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
        {e.estado === "OBSERVADO_REQUISITOS" && <SubsanacionRequisitos detalle={detalle} />}
        {e.estado === "EN_SUBSANACION" && subsanacion.tipoItse && (
          <SubsanacionCliente
            expedienteId={e.id}
            tipoItse={subsanacion.tipoItse}
            documentos={detalle.documentos}
            presentadaAt={presentadaAt}
            puedeSubir={puedeSubirEvidencia({
              tipoItse: subsanacion.tipoItse,
              presentada: presentadaAt !== null,
              vencido,
            })}
            reprogramadaPara={e.diligenciaProgramadaPara}
          />
        )}
        <ExpedienteDatos detalle={detalle} />
        <InspeccionResumen
          total={inspeccion.total}
          nombres={inspeccion.nombres}
          avisoContacto={
            e.estado === "INSPECTOR_DESIGNADO" || e.estado === "DILIGENCIA_PROGRAMADA"
              ? { telefono: e.solicitanteTelefono }
              : undefined
          }
          programadaPara={e.diligenciaProgramadaPara}
          lugar={detalle.establecimiento.direccion}
        />
        <ObservacionesLista observaciones={subsanacion.observaciones} />
        {e.estado === "EN_SUBSANACION" && subsanacion.limite && (
          <PlazoSubsanacion limite={subsanacion.limite} />
        )}
        {certificado && <CertificadoCliente expedienteId={e.id} resumen={certificado} />}
        {resolucionNoCumple && (
          <ResolucionNoCumpleCliente expedienteId={e.id} resolucionAt={resolucionNoCumple.resolucionAt} />
        )}
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
