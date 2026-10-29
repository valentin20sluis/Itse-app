import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { CERTIFICADO_ESTADO_LABELS } from "@/modules/certificados/constants/certificado-labels";
import { avisoCertificado } from "@/modules/certificados/utils/aviso-certificado";
import { DIAS_ALERTA_VENCIMIENTO } from "@/modules/certificados/utils/vigencia";
import type { InicioCliente } from "@/modules/client-area/types/inicio.types";
import { cn } from "@/lib/utils";

const MAX_ESTABLECIMIENTOS = 5;
const REGISTRAR = "/mi-cuenta/establecimientos";

const enlace = "min-h-11 w-full whitespace-normal border-foreground/30 sm:w-fit";

function Cifra({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="min-w-0 break-words text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums text-brand">{value}</dd>
    </div>
  );
}

function TarjetaResumen({
  titulo,
  children,
  pie,
}: {
  titulo: string;
  children: ReactNode;
  pie: ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <h3 className="font-heading text-base font-medium leading-snug">{titulo}</h3>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">{children}</CardContent>
      <CardFooter>{pie}</CardFooter>
    </Card>
  );
}

export function ResumenInicio({ inicio }: { inicio: InicioCliente }) {
  const { expedientes: exp, establecimientos: est, certificados: cert, puedeSolicitar } = inicio;
  const visibles = est.lista.slice(0, MAX_ESTABLECIMIENTOS);
  const ocultos = est.lista.length - visibles.length;
  const etiquetas = CERTIFICADO_ESTADO_LABELS;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <TarjetaResumen
        titulo="Expedientes"
        pie={
          <Link
            href="/mi-cuenta/expedientes"
            className={buttonVariants({ variant: "outline", className: enlace })}
          >
            Ver mis expedientes
          </Link>
        }
      >
        {exp.total === 0 ? (
          <p className="text-muted-foreground">Aún no tienes solicitudes.</p>
        ) : (
          <dl className="space-y-1">
            <Cifra label="En curso" value={exp.enCurso} />
            <Cifra label="Finalizados" value={exp.finalizados} />
          </dl>
        )}
      </TarjetaResumen>

      <TarjetaResumen
        titulo="Establecimientos"
        pie={
          <Link
            href={REGISTRAR}
            className={buttonVariants({ variant: "outline", className: enlace })}
          >
            {est.total === 0
              ? "Registrar establecimiento"
              : puedeSolicitar
                ? "Ver mis establecimientos"
                : "Registrar otro establecimiento"}
          </Link>
        }
      >
        {est.total === 0 ? (
          <p className="text-muted-foreground">Aún no tienes establecimientos registrados.</p>
        ) : (
          <>
            <ul className="space-y-1">
              {visibles.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="min-w-0 break-words">{e.nombre}</span>
                  <span className={cn("text-xs", e.libre ? "font-medium text-brand" : "text-muted-foreground")}>
                    {e.libre ? e.detalle : `Con solicitud (${e.detalle})`}
                  </span>
                </li>
              ))}
            </ul>
            {ocultos > 0 && (
              <p className="text-muted-foreground">
                Y {ocultos} más.{" "}
                {!puedeSolicitar && (
                  <Link href={REGISTRAR} className="inline-flex min-h-11 items-center font-medium underline underline-offset-2">
                    Ver mis establecimientos
                  </Link>
                )}
              </p>
            )}
            {!puedeSolicitar && (
              <p className="text-muted-foreground">
                Todos tus establecimientos ya tienen una solicitud. Para solicitar otra inspección, registra otro
                establecimiento.
              </p>
            )}
          </>
        )}
      </TarjetaResumen>

      <TarjetaResumen
        titulo="Certificados"
        pie={
          <Link
            href="/mi-cuenta/certificados"
            className={buttonVariants({ variant: "outline", className: enlace })}
          >
            Ver mis certificados
          </Link>
        }
      >
        {cert.total === 0 ? (
          <p className="text-muted-foreground">
            Aún no tienes certificados. Aparecerán aquí cuando termine tu trámite.
          </p>
        ) : (
          <>
            <dl className="space-y-1">
              <Cifra label={`${etiquetas.VIGENTE.label}s`} value={cert.vigentes} />
              <Cifra
                label={`${etiquetas.POR_VENCER.label} (${DIAS_ALERTA_VENCIMIENTO} días o menos)`}
                value={cert.porVencer}
              />
              <Cifra label={`${etiquetas.VENCIDO.label}s`} value={cert.vencidos} />
            </dl>
            {cert.avisos.length > 0 && (
              <ul className="space-y-2">
                {cert.avisos.map((c) => (
                  <li key={c.expedienteId} className="break-words">
                    <span className="font-medium">{c.nombreComercial}: </span>
                    {avisoCertificado(c)}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </TarjetaResumen>
    </div>
  );
}
