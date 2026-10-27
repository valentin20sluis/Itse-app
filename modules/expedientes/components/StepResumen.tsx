"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { enviarSolicitudAction } from "@/modules/expedientes/actions/expediente.actions";
import type {
  Expediente,
  NivelRiesgo,
  TipoDocumento,
} from "@/modules/expedientes/types/expediente.types";
import { declaracionTexto } from "@/modules/expedientes/utils/declaracion";
import {
  DOCUMENTOS,
  documentosRequeridos,
  planSeguridadFisico,
} from "@/modules/expedientes/utils/documentos";
import type { Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";
import { tipoItsePorRiesgo } from "@/modules/expedientes/utils/riesgo";
import type { ActionResult } from "@/lib/action-result";

const NIVELES: Record<NivelRiesgo, string> = {
  BAJO: "Riesgo bajo",
  MEDIO: "Riesgo medio",
  ALTO: "Riesgo alto",
  MUY_ALTO: "Riesgo muy alto",
};

type Props = {
  expediente: Expediente;
  establecimiento: Establecimiento;
  tiposSubidos: readonly TipoDocumento[];
  onBack: () => void;
};

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div>
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium">{valor || "Sin completar"}</dd>
    </div>
  );
}

export function StepResumen({ expediente, establecimiento, tiposSubidos, onBack }: Props) {
  const [state, action, pending] = useActionState<
    ActionResult<{ id: string; numero: string }> | null,
    FormData
  >(enviarSolicitudAction.bind(null, expediente.id), null);

  if (state?.ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Solicitud presentada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3" role="status">
          <p>
            Tu número de expediente es <strong>{state.data.numero}</strong>.
          </p>
          <Badge variant="secondary">Presentado</Badge>
          <div>
            <Link
              href="/mi-cuenta/expedientes"
              className={buttonVariants({ className: "h-11 px-4" })}
            >
              Ir a mis expedientes
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nivel = expediente.nivelRiesgo;
  const tipos = documentosRequeridos(expediente);
  const requeridos = DOCUMENTOS.filter((d) => tipos.includes(d.tipo));
  const faltantes = requeridos.filter((d) => !tiposSubidos.includes(d.tipo));
  const planFisico = planSeguridadFisico({
    nivelRiesgo: nivel,
    numeroPisos: establecimiento.numeroPisos,
    tieneSotano: expediente.tieneSotano,
    areaM2: Number(establecimiento.areaM2),
  });
  const errorCampo = !state?.ok ? state?.fieldErrors?.aceptada?.[0] : undefined;

  return (
    <form action={action} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Resumen de tu solicitud</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Dato etiqueta="Establecimiento" valor={establecimiento.nombreComercial} />
            <Dato
              etiqueta="Trámite"
              valor={expediente.tipoTramite === "NUEVA" ? "ITSE nueva" : "Renovación"}
            />
            <Dato etiqueta="Nivel de riesgo" valor={nivel ? NIVELES[nivel] : null} />
            <Dato
              etiqueta="Tipo de ITSE"
              valor={nivel ? (tipoItsePorRiesgo(nivel) === "PREVIA" ? "Previa" : "Posterior") : null}
            />
            <Dato etiqueta="Solicitante" valor={expediente.solicitanteNombre} />
            <Dato etiqueta="Documento" valor={expediente.solicitanteDocumento} />
            <Dato etiqueta="Teléfono" valor={expediente.solicitanteTelefono} />
            <Dato etiqueta="Correo" valor={expediente.solicitanteEmail} />
            <Dato etiqueta="Número de boleta" valor={expediente.numeroBoleta} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2 text-sm">
            {requeridos.map((d) => (
              <li key={d.tipo} className="flex flex-wrap items-center justify-between gap-2">
                <span>{d.etiqueta}</span>
                <Badge variant={tiposSubidos.includes(d.tipo) ? "secondary" : "outline"}>
                  {tiposSubidos.includes(d.tipo) ? "Subido" : "Pendiente"}
                </Badge>
              </li>
            ))}
          </ul>
          {planFisico && (
            <p className="text-sm text-muted-foreground">
              El Plan de seguridad no se sube: el inspector lo revisa en físico durante la diligencia.
            </p>
          )}
          {faltantes.length > 0 && (
            <p className="text-sm text-destructive">
              Faltan documentos obligatorios: {faltantes.map((d) => d.etiqueta).join(", ")}.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Declaración jurada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {nivel ? (
            <p>{declaracionTexto(expediente.tipoTramite, nivel)}</p>
          ) : (
            <p className="text-muted-foreground">
              Elige el nivel de riesgo en el paso 2 para ver la declaración.
            </p>
          )}
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              name="aceptada"
              value="on"
              required
              aria-invalid={errorCampo ? true : undefined}
              aria-describedby={errorCampo ? "aceptada-error" : undefined}
              className="size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
            <span>Acepto la declaración jurada</span>
          </label>
          {errorCampo && (
            <p id="aceptada-error" className="text-destructive">
              {errorCampo}
            </p>
          )}
        </CardContent>
      </Card>

      <div aria-live="polite">
        {state && !state.ok && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="outline" className="h-11 px-4" onClick={onBack} disabled={pending}>
          Atrás
        </Button>
        <Button type="submit" className="h-11 px-4" disabled={pending}>
          {pending ? "Presentando…" : "Presentar solicitud"}
        </Button>
      </div>
    </form>
  );
}
