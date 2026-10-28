import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CertificadoEstadoBadge } from "@/modules/certificados/components/CertificadoEstadoBadge";
import { DescargasCertificado } from "@/modules/certificados/components/DescargasCertificado";
import type { ResumenCertificado } from "@/modules/certificados/services/certificado.service";
import { diasParaVencer } from "@/modules/certificados/utils/vigencia";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";

type Props = { expedienteId: string; resumen: ResumenCertificado; ahora?: Date };

export function CertificadoCliente({ expedienteId, resumen, ahora = new Date() }: Props) {
  const dias = resumen.venceAt ? diasParaVencer(resumen.venceAt, ahora) : null;
  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-medium">Tu certificado de ITSE</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
          <dt className="font-medium">Número</dt>
          <dd>{resumen.numero}</dd>
          <dt className="font-medium">Vigencia</dt>
          <dd>
            {resumen.emitidoAt && resumen.venceAt
              ? `Del ${formatFecha(resumen.emitidoAt)} al ${formatFecha(resumen.venceAt)}`
              : "-"}
          </dd>
          <dt className="font-medium">Estado</dt>
          <dd>{resumen.estado ? <CertificadoEstadoBadge estado={resumen.estado} /> : "-"}</dd>
        </dl>
        {resumen.estado === "POR_VENCER" && dias !== null && (
          <p className="text-sm">
            Tu certificado vence en {dias} {dias === 1 ? "día" : "días"}. Cuando falte poco, inicia una nueva
            solicitud para renovarlo.
          </p>
        )}
        <DescargasCertificado expedienteId={expedienteId} numero={resumen.numero} />
      </CardContent>
    </Card>
  );
}
