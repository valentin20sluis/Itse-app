"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { iniciarPagoAction } from "@/modules/expedientes/actions/pago.actions";
import { MONEDA, montoTasa } from "@/modules/expedientes/constants/tasa";
import type {
  Expediente,
  NivelRiesgo,
  TipoDocumento,
} from "@/modules/expedientes/types/expediente.types";
import { CALIDADES } from "@/modules/expedientes/components/StepSolicitante";
import { declaracionTexto } from "@/modules/expedientes/utils/declaracion";
import {
  DOCUMENTOS,
  documentosRequeridos,
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

export function StepResumen({
  expediente,
  establecimiento,
  tiposSubidos,
  onBack,
}: Props) {
  const [state, action, pending] = useActionState<
    ActionResult<null> | null,
    FormData
  >(iniciarPagoAction.bind(null, expediente.id), null);

  const nivel = expediente.nivelRiesgo;
  const tipos = documentosRequeridos({
    ...expediente,
    numeroPisos: establecimiento.numeroPisos,
  });
  const requeridos = DOCUMENTOS.filter((d) => tipos.includes(d.tipo));
  const faltantes = requeridos.filter((d) => !tiposSubidos.includes(d.tipo));
  const errorCampo = !state?.ok ? state?.fieldErrors?.aceptada?.[0] : undefined;

  return (
    <form action={action} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Resumen y pago</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Dato
              etiqueta="Establecimiento"
              valor={establecimiento.nombreComercial}
            />
            <Dato
              etiqueta="Trámite"
              valor={
                expediente.tipoTramite === "NUEVA" ? "ITSE nueva" : "Renovación"
              }
            />
            <Dato
              etiqueta="Nivel de riesgo"
              valor={nivel ? NIVELES[nivel] : null}
            />
            <Dato
              etiqueta="Tipo de ITSE"
              valor={
                nivel
                  ? tipoItsePorRiesgo(nivel) === "PREVIA"
                    ? "Previa"
                    : "Posterior"
                  : null
              }
            />
            <Dato
              etiqueta="Calidad del solicitante"
              valor={
                CALIDADES.find((c) => c.value === expediente.calidadSolicitante)
                  ?.label ?? null
              }
            />
            <Dato etiqueta="Solicitante" valor={expediente.solicitanteNombre} />
            <Dato
              etiqueta="Documento"
              valor={expediente.solicitanteDocumento}
            />
            <Dato etiqueta="Teléfono" valor={expediente.solicitanteTelefono} />
            <Dato etiqueta="Correo" valor={expediente.solicitanteEmail} />
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
              <li
                key={d.tipo}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>{d.etiqueta}</span>
                <Badge
                  variant={
                    tiposSubidos.includes(d.tipo) ? "secondary" : "outline"
                  }
                >
                  {tiposSubidos.includes(d.tipo) ? "Subido" : "Pendiente"}
                </Badge>
              </li>
            ))}
          </ul>
          {faltantes.length > 0 && (
            <p id="faltantes-docs" className="text-sm text-destructive">
              Faltan documentos obligatorios:{" "}
              {faltantes.map((d) => d.etiqueta).join(", ")}. Súbelos para poder
              pagar.
            </p>
          )}
        </CardContent>
      </Card>

      {nivel && (
        <Card>
          <CardHeader>
            <CardTitle>Tasa a pagar</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-2xl font-semibold">
              {new Intl.NumberFormat("es-PE", {
                style: "currency",
                currency: MONEDA.toUpperCase(),
              }).format(montoTasa(nivel) / 100)}
            </p>
            <p className="text-muted-foreground">
              Monto ficticio, modo de prueba.
            </p>
          </CardContent>
        </Card>
      )}

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
        <Button
          type="button"
          variant="outline"
          className="h-11 px-4"
          onClick={onBack}
          disabled={pending}
        >
          Atrás
        </Button>
        <Button
          type="submit"
          className="h-11 px-4"
          disabled={pending || faltantes.length > 0}
          aria-describedby={faltantes.length > 0 ? "faltantes-docs" : undefined}
        >
          {pending ? "Redirigiendo a Stripe…" : "Aceptar y pagar"}
        </Button>
      </div>
    </form>
  );
}
