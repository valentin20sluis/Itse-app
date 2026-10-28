import type { ReactNode } from "react";
import { AprobarCertificadoButton } from "@/modules/certificados/components/AprobarCertificadoButton";
import { CertificadoEstadoBadge } from "@/modules/certificados/components/CertificadoEstadoBadge";
import { DescargasCertificado } from "@/modules/certificados/components/DescargasCertificado";
import { GenerarCertificadoButton } from "@/modules/certificados/components/GenerarCertificadoButton";
import { getResumenCertificado } from "@/modules/certificados/services/certificado.service";
import { certificadoDescargable } from "@/modules/certificados/utils/certificado-acceso";
import type { EstadoExpediente } from "@/modules/expedientes/constants/estado-labels";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";
import type { Usuario } from "@/modules/usuarios/types/user.types";

type Props = {
  usuario: Pick<Usuario, "id" | "rol">;
  expedienteId: string;
  estado: EstadoExpediente;
};

const ESTADOS_CON_CERTIFICADO: EstadoExpediente[] = [
  "CUMPLE",
  "CERTIFICADO_PENDIENTE_FIRMA",
  "FINALIZADO",
  "ENTREGADO",
];

export async function PanelCertificado({ usuario, expedienteId, estado }: Props) {
  if (!ESTADOS_CON_CERTIFICADO.includes(estado) || usuario.rol === "cliente") return null;

  let contenido: ReactNode;
  if (estado === "CUMPLE") {
    contenido = <GenerarCertificadoButton expedienteId={expedienteId} />;
  } else {
    const resumen = await getResumenCertificado(usuario, expedienteId);
    if (!resumen) return null;
    if (estado === "CERTIFICADO_PENDIENTE_FIRMA") {
      contenido = (
        <>
          <p className="text-sm">Certificado N.° {resumen.numero} pendiente de aprobación de Jefatura.</p>
          {usuario.rol === "superadmin" ? (
            <AprobarCertificadoButton expedienteId={expedienteId} />
          ) : (
            <p className="text-sm text-muted-foreground">Esperando la aprobación de Jefatura.</p>
          )}
        </>
      );
    } else {
      contenido = (
        <>
          <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
            <dt className="font-medium">Número</dt>
            <dd>{resumen.numero}</dd>
            <dt className="font-medium">Fecha de expedición</dt>
            <dd>{resumen.emitidoAt ? formatFecha(resumen.emitidoAt) : "-"}</dd>
            <dt className="font-medium">Fecha de vencimiento</dt>
            <dd>{resumen.venceAt ? formatFecha(resumen.venceAt) : "-"}</dd>
            <dt className="font-medium">Estado</dt>
            <dd>{resumen.estado ? <CertificadoEstadoBadge estado={resumen.estado} /> : "-"}</dd>
          </dl>
          <p className="text-sm text-muted-foreground">
            {estado === "FINALIZADO"
              ? "Certificado aprobado y Resolución Gerencial generada. Falta enviarlos al cliente."
              : "Enviado al cliente."}
          </p>
          {certificadoDescargable(usuario.rol, estado) && (
            <DescargasCertificado expedienteId={expedienteId} numero={resumen.numero} />
          )}
        </>
      );
    }
  }

  return (
    <section aria-labelledby="certificado-titulo" className="space-y-3">
      <h3 id="certificado-titulo" className="font-medium">
        Certificado de ITSE
      </h3>
      {contenido}
    </section>
  );
}
