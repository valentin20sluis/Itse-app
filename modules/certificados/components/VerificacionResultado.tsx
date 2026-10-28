import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CertificadoEstadoBadge } from "@/modules/certificados/components/CertificadoEstadoBadge";
import type { VerificacionData } from "@/modules/certificados/services/verificacion.service";
import { diasParaVencer } from "@/modules/certificados/utils/vigencia";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";

function textoEstado({ estado, venceAt }: VerificacionData, ahora: Date): string {
  switch (estado) {
    case "REVOCADO":
      return "Este certificado fue anulado.";
    case "VENCIDO":
      return `Este certificado venció el ${formatFecha(venceAt)}.`;
    case "POR_VENCER": {
      const dias = diasParaVencer(venceAt, ahora);
      if (dias === 0) return `Este certificado vence hoy (${formatFecha(venceAt)}).`;
      return `Este certificado está vigente, pero vence en ${dias} ${dias === 1 ? "día" : "días"} (${formatFecha(venceAt)}).`;
    }
    default:
      return `Este certificado está vigente hasta el ${formatFecha(venceAt)}.`;
  }
}

export function VerificacionResultado({ data, ahora }: { data: VerificacionData; ahora: Date }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-3 text-xl">
          Certificado N.° {data.numero}
          <CertificadoEstadoBadge estado={data.estado} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-medium">
          {textoEstado(data, ahora)}
        </p>
        <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
          <dt className="font-medium">Establecimiento</dt>
          <dd className="break-words">{data.nombreComercial}</dd>
          <dt className="font-medium">Distrito</dt>
          <dd className="break-words">{data.distrito}</dd>
          <dt className="font-medium">Fecha de expedición</dt>
          <dd>{formatFecha(data.emitidoAt)}</dd>
          <dt className="font-medium">Fecha de vencimiento</dt>
          <dd>{formatFecha(data.venceAt)}</dd>
        </dl>
        <p className="text-xs text-muted-foreground">Proyecto académico. Documento sin validez oficial.</p>
      </CardContent>
    </Card>
  );
}
