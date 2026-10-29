import { Building2, FileText, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { AccesosRapidos } from "@/modules/client-area/components/AccesosRapidos";
import { PasoCard } from "@/modules/client-area/components/PasoCard";
import { ResumenInicio } from "@/modules/client-area/components/ResumenInicio";
import type { InicioCliente } from "@/modules/client-area/types/inicio.types";

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

export function InicioClienteView({ inicio, saludo }: { inicio: InicioCliente; saludo: string }) {
  const { pasos, puedeSolicitar } = inicio;
  const sinNada = inicio.establecimientos.total === 0 && inicio.expedientes.total === 0;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title={`Hola, ${saludo}`} description="Aquí puedes seguir tus trámites de ITSE." />

      {sinNada ? (
        <EmptyState
          icon={<Building2 aria-hidden="true" />}
          title="Registra tu primer establecimiento"
          description="Primero registra el local que quieres inspeccionar. Luego podrás iniciar tu solicitud."
          action={
            <Link
              href="/mi-cuenta/establecimientos"
              className={buttonVariants({ className: "min-h-11" })}
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              Registrar establecimiento
            </Link>
          }
        />
      ) : (
        <>
          <Seccion titulo="Qué sigue">
            {pasos.length > 0 ? (
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pasos.map((p) => (
                  <li key={p.expedienteId} className="min-w-0">
                    <PasoCard paso={p} />
                  </li>
                ))}
              </ul>
            ) : puedeSolicitar ? (
              <EmptyState
                icon={<FileText aria-hidden="true" />}
                title="Aún no tienes solicitudes"
                description="Crea tu primera solicitud para iniciar el trámite."
                action={
                  <Link
                    href="/mi-cuenta/nueva-solicitud"
                    className={buttonVariants({ className: "min-h-11" })}
                  >
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    Nueva solicitud
                  </Link>
                }
              />
            ) : null}
          </Seccion>
          <Seccion titulo="Tu resumen">
            <ResumenInicio inicio={inicio} />
          </Seccion>
          <Seccion titulo="Accesos rápidos">
            <AccesosRapidos puedeSolicitar={puedeSolicitar} />
          </Seccion>
        </>
      )}
    </div>
  );
}
