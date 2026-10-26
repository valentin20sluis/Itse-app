"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action-result";
import type { Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";
import { saveBorradorAction } from "@/modules/expedientes/actions/expediente.actions";
import { StepEstablecimiento } from "@/modules/expedientes/components/StepEstablecimiento";
import { StepResumen } from "@/modules/expedientes/components/StepResumen";
import { StepRiesgo } from "@/modules/expedientes/components/StepRiesgo";
import {
  StepSolicitante,
  type DefaultsSolicitante,
} from "@/modules/expedientes/components/StepSolicitante";
import { WizardStepper } from "@/modules/expedientes/components/WizardStepper";
import type { Expediente, ExpedienteDocumento } from "@/modules/expedientes/types/expediente.types";
import { DOCUMENTOS } from "@/modules/expedientes/utils/documentos";

type Props = {
  establecimientos: Establecimiento[];
  borrador: Expediente | null;
  documentos: ExpedienteDocumento[];
  defaultsSolicitante: DefaultsSolicitante;
};

// Fase A: el paso Documentos real (subida) llega en la Fase B.
function PasoDocumentos({
  expediente,
  documentos,
  onSaved,
  onBack,
}: {
  expediente: Expediente;
  documentos: ExpedienteDocumento[];
  onSaved: (expediente: Expediente) => void;
  onBack: () => void;
}) {
  const [state, action, pending] = useActionState<ActionResult<Expediente> | null, FormData>(
    async (prev, formData) => {
      const res = await saveBorradorAction(4, expediente.id, prev, formData);
      if (res.ok) onSaved(res.data);
      return res;
    },
    null,
  );
  const [boleta, setBoleta] = useState(expediente.numeroBoleta ?? "");
  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const error = fieldErrors.numeroBoleta?.[0];
  const generalError =
    state && !state.ok && Object.keys(fieldErrors).length === 0 ? state.error : null;

  return (
    <form action={action} className="space-y-6" noValidate>
      <p className="rounded-lg bg-muted p-3 text-sm">
        La subida de documentos estará disponible pronto.
      </p>
      <ul className="space-y-2 text-sm">
        {DOCUMENTOS.map((d) => (
          <li key={d.tipo} className="flex flex-wrap items-center justify-between gap-2">
            <span>{d.etiqueta}</span>
            <span className="flex gap-2">
              <Badge variant={d.requerido ? "default" : "outline"}>
                {d.requerido ? "Obligatorio" : "Opcional"}
              </Badge>
              <Badge variant="outline">
                {documentos.some((x) => x.tipo === d.tipo) ? "Subido" : "Pendiente"}
              </Badge>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="numeroBoleta">Número de boleta</Label>
        <Input
          id="numeroBoleta"
          name="numeroBoleta"
          value={boleta}
          onChange={(e) => setBoleta(e.target.value)}
          className="h-11"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "numeroBoleta-error" : undefined}
        />
        {error && (
          <p id="numeroBoleta-error" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      {generalError && (
        <p role="alert" className="text-sm text-destructive">
          {generalError}
        </p>
      )}
      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="outline" className="h-11 px-4" onClick={onBack} disabled={pending}>
          Atrás
        </Button>
        <Button type="submit" className="h-11 px-6" disabled={pending}>
          {pending ? "Guardando…" : "Siguiente"}
        </Button>
      </div>
    </form>
  );
}

export function SolicitudWizard({
  establecimientos,
  borrador,
  documentos,
  defaultsSolicitante,
}: Props) {
  const [paso, setPaso] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [expediente, setExpediente] = useState<Expediente | null>(borrador);

  const establecimiento = establecimientos.find((e) => e.id === expediente?.establecimientoId);
  const siguiente = (nuevo: Expediente) => {
    setExpediente(nuevo);
    setPaso((p) => (p < 5 ? ((p + 1) as 2 | 3 | 4 | 5) : p));
  };
  const atras = () => setPaso((p) => (p > 1 ? ((p - 1) as 1 | 2 | 3 | 4) : p));

  return (
    <div className="space-y-6">
      <WizardStepper pasoActual={paso} />
      {paso === 1 && (
        <StepEstablecimiento
          establecimientos={establecimientos}
          expediente={expediente}
          onSaved={siguiente}
        />
      )}
      {paso === 2 && expediente && establecimiento && (
        <StepRiesgo
          establecimiento={establecimiento}
          expediente={expediente}
          onSaved={siguiente}
          onBack={atras}
        />
      )}
      {paso === 3 && expediente && (
        <StepSolicitante
          expediente={expediente}
          defaults={defaultsSolicitante}
          onSaved={siguiente}
          onBack={atras}
        />
      )}
      {paso === 4 && expediente && (
        <PasoDocumentos
          expediente={expediente}
          documentos={documentos}
          onSaved={siguiente}
          onBack={atras}
        />
      )}
      {paso === 5 && expediente && establecimiento && (
        <StepResumen
          expediente={expediente}
          establecimientoNombre={establecimiento.nombreComercial}
          tiposSubidos={documentos.map((d) => d.tipo)}
          onBack={atras}
        />
      )}
    </div>
  );
}
