"use client";

import { useState } from "react";
import type { Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";
import { StepDocumentos } from "@/modules/expedientes/components/StepDocumentos";
import { StepEstablecimiento } from "@/modules/expedientes/components/StepEstablecimiento";
import { StepResumen } from "@/modules/expedientes/components/StepResumen";
import { StepRiesgo } from "@/modules/expedientes/components/StepRiesgo";
import {
  StepSolicitante,
  type DefaultsSolicitante,
} from "@/modules/expedientes/components/StepSolicitante";
import { WizardStepper } from "@/modules/expedientes/components/WizardStepper";
import type { Expediente, ExpedienteDocumento } from "@/modules/expedientes/types/expediente.types";
import { faltantesBorrador } from "@/modules/expedientes/utils/completitud";

type Props = {
  establecimientos: Establecimiento[];
  borrador: Expediente | null;
  documentos: ExpedienteDocumento[];
  defaultsSolicitante: DefaultsSolicitante;
};


export function SolicitudWizard({
  establecimientos,
  borrador,
  documentos,
  defaultsSolicitante,
}: Props) {
  const [expediente, setExpediente] = useState<Expediente | null>(borrador);
  const establecimiento = establecimientos.find((e) => e.id === expediente?.establecimientoId);
  const [paso, setPaso] = useState<1 | 2 | 3 | 4 | 5>(
    borrador &&
      establecimiento &&
      faltantesBorrador(
        { ...borrador, numeroPisos: establecimiento.numeroPisos },
        documentos.map((d) => d.tipo),
      ).length === 0
      ? 5
      : 1,
  );
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
      {paso === 4 && expediente && establecimiento && (
        <StepDocumentos
          expediente={expediente}
          establecimiento={establecimiento}
          documentos={documentos}
          onNext={() => setPaso(5)}
          onBack={atras}
        />
      )}
      {paso === 5 && expediente && establecimiento && (
        <StepResumen
          expediente={expediente}
          establecimiento={establecimiento}
          tiposSubidos={documentos.map((d) => d.tipo)}
          onBack={atras}
        />
      )}
    </div>
  );
}
