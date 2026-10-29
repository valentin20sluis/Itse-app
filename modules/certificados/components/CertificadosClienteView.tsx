import { Award, Download } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { CertificadoEstadoBadge } from "@/modules/certificados/components/CertificadoEstadoBadge";
import { DescargasCertificado } from "@/modules/certificados/components/DescargasCertificado";
import type {
  CertificadoClienteFila,
  ResolucionNoCumpleClienteFila,
} from "@/modules/certificados/services/certificado-lista.service";
import { avisoCertificado } from "@/modules/certificados/utils/aviso-certificado";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";

type Props = {
  filas: CertificadoClienteFila[];
  resoluciones?: ResolucionNoCumpleClienteFila[];
};

export function CertificadosClienteView({ filas, resoluciones = [] }: Props) {
  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Mis certificados"
        description="Descarga tus certificados y resoluciones, y revisa su vigencia."
      />
      {filas.length === 0 && resoluciones.length === 0 ? (
        <EmptyState
          icon={<Award />}
          title="Aún no tienes certificados. Aparecerán aquí cuando termine tu trámite."
        />
      ) : (
        <>
          {filas.length > 0 && (
            <ul className="grid gap-3 lg:grid-cols-2">
              {filas.map((f) => {
                const texto = avisoCertificado(f);
                return (
                  <li
                    key={f.expedienteId}
                    className="min-w-0 space-y-3 rounded-xl border border-foreground/20 bg-card shadow-sm p-4 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">Certificado N.° {f.numero}</p>
                      <CertificadoEstadoBadge estado={f.estado} />
                    </div>
                    <p className="break-words">{f.nombreComercial}</p>
                    <p className="text-muted-foreground">
                      Emitido el {formatFecha(f.emitidoAt)}. Vence el{" "}
                      {formatFecha(f.venceAt)}.
                    </p>
                    {texto && <p>{texto}</p>}
                    <DescargasCertificado
                      expedienteId={f.expedienteId}
                      numero={f.numero}
                    />
                    <Link
                      href={`/mi-cuenta/expedientes/${f.expedienteId}`}
                      className={buttonVariants({
                        variant: "ghost",
                        className: "min-h-11",
                      })}
                    >
                      Ver expediente
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {resoluciones.length > 0 && (
            <section
              aria-labelledby="resoluciones-no-cumple"
              className="space-y-3"
            >
              <h2
                id="resoluciones-no-cumple"
                className="font-heading text-base font-medium"
              >
                Resolución de no cumple
              </h2>
              <ul className="grid gap-3 lg:grid-cols-2">
                {resoluciones.map((r) => (
                  <li
                    key={r.expedienteId}
                    className="min-w-0 space-y-3 rounded-xl border border-foreground/20 bg-card shadow-sm p-4 text-sm"
                  >
                    <p className="break-words font-medium">
                      {r.nombreComercial}
                    </p>
                    <p className="text-muted-foreground">
                      Resolución del {formatFecha(r.resolucionAt)}. No se emitió
                      certificado.
                    </p>
                    <a
                      href={`/api/expedientes/${r.expedienteId}/resolucion`}
                      download
                      aria-label={`Descargar resolución de no cumple de ${r.nombreComercial}`}
                      className={buttonVariants({
                        className: "inline-flex min-h-11 w-fit",
                      })}
                    >
                      <Download data-icon="inline-start" aria-hidden="true" />
                      Descargar resolución
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
