"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";
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
import {
  DOCUMENTOS,
  documentosRequeridos,
  planSeguridadFisico,
} from "@/modules/expedientes/utils/documentos";

type Props = {
  establecimientos: Establecimiento[];
  borrador: Expediente | null;
  documentos: ExpedienteDocumento[];
  defaultsSolicitante: DefaultsSolicitante;
};

function PasoDocumentos({
  expediente,
  establecimiento,
  documentos,
  onNext,
  onBack,
}: {
  expediente: Expediente;
  establecimiento: Establecimiento;
  documentos: ExpedienteDocumento[];
  onNext: () => void;
  onBack: () => void;
}) {
  const tipos = documentosRequeridos(expediente);
  const requeridos = DOCUMENTOS.filter((d) => tipos.includes(d.tipo));
  const planFisico = planSeguridadFisico({
    nivelRiesgo: expediente.nivelRiesgo,
    numeroPisos: establecimiento.numeroPisos,
    tieneSotano: expediente.tieneSotano,
    areaM2: Number(establecimiento.areaM2),
  });

  return (
    <div className="space-y-6">
      <p className="rounded-lg bg-muted p-3 text-sm">
        La subida de documentos estará disponible pronto.
      </p>
      <ul className="space-y-2 text-sm">
        {requeridos.map((d) => (
          <li key={d.tipo} className="flex flex-wrap items-center justify-between gap-2">
            <span>{d.etiqueta}</span>
            <Badge variant="outline">
              {documentos.some((x) => x.tipo === d.tipo) ? "Subido" : "Pendiente"}
            </Badge>
          </li>
        ))}
      </ul>
      {planFisico && (
        <p className="rounded-lg bg-muted p-3 text-sm">
          El Plan de seguridad no se sube: el inspector lo revisa en físico durante la diligencia.
        </p>
      )}
      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="outline" className="h-11 px-4" onClick={onBack}>
          Atrás
        </Button>
        <Button type="button" className="h-11 px-6" onClick={onNext}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}

export function SolicitudWizard({
  establecimientos,
  borrador,
  documentos,
  defaultsSolicitante,
}: Props) {
  const [paso, setPaso] = useState<1 | 2 | 3 | 4 | 5>(
    borrador && faltantesBorrador(borrador, documentos.map((d) => d.tipo)).length === 0 ? 5 : 1,
  );
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
      {paso === 4 && expediente && establecimiento && (
        <PasoDocumentos
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
