import { Award } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { CertificadoEstadoBadge } from "@/modules/certificados/components/CertificadoEstadoBadge";
import { DescargasCertificado } from "@/modules/certificados/components/DescargasCertificado";
import type { CertificadoClienteFila } from "@/modules/certificados/services/certificado-lista.service";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";

function aviso({ estado, diasRestantes }: CertificadoClienteFila): string | null {
  if (estado === "VENCIDO") return "Tu certificado venció. Inicia una nueva solicitud para renovarlo.";
  if (estado !== "POR_VENCER") return null;
  return `Tu certificado vence en ${diasRestantes} ${diasRestantes === 1 ? "día" : "días"}. Cuando falte poco, inicia una nueva solicitud para renovarlo.`;
}

export function CertificadosClienteView({ filas }: { filas: CertificadoClienteFila[] }) {
  return (
    <div className="min-w-0">
      <PageHeader title="Mis certificados" description="Descarga tus certificados y revisa su vigencia." />
      {filas.length === 0 ? (
        <EmptyState
          icon={<Award />}
          title="Aún no tienes certificados. Aparecerán aquí cuando termine tu trámite."
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {filas.map((f) => {
            const texto = aviso(f);
            return (
              <li
                key={f.expedienteId}
                className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">Certificado N.° {f.numero}</p>
                  <CertificadoEstadoBadge estado={f.estado} />
                </div>
                <p className="break-words">{f.nombreComercial}</p>
                <p className="text-muted-foreground">
                  Emitido el {formatFecha(f.emitidoAt)}. Vence el {formatFecha(f.venceAt)}.
                </p>
                {texto && <p>{texto}</p>}
                <DescargasCertificado expedienteId={f.expedienteId} numero={f.numero} />
                <Link
                  href={`/mi-cuenta/expedientes/${f.expedienteId}`}
                  className={buttonVariants({ variant: "ghost", className: "min-h-11" })}
                >
                  Ver expediente
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
