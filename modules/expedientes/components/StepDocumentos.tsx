"use client";

import { Button } from "@/components/ui/button";
import { DocumentoUploader } from "@/modules/expedientes/components/DocumentoUploader";
import type { Expediente, ExpedienteDocumento } from "@/modules/expedientes/types/expediente.types";
import {
  DOCUMENTOS,
  documentosOpcionales,
  documentosRequeridos,
  planSeguridadFisico,
} from "@/modules/expedientes/utils/documentos";

type Props = {
  expediente: Expediente;
  documentos: ExpedienteDocumento[];
  onNext: () => void;
  onBack: () => void;
};

export function StepDocumentos({ expediente, documentos, onNext, onBack }: Props) {
  const requeridos = documentosRequeridos(expediente);
  const opcionales = documentosOpcionales(expediente);
  const planFisico = planSeguridadFisico(expediente.nivelRiesgo);
  const ordenados = [
    ...DOCUMENTOS.filter((d) => requeridos.includes(d.tipo)),
    ...DOCUMENTOS.filter((d) => opcionales.includes(d.tipo)),
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Sube un archivo PDF, JPG, PNG o WebP por documento (PDF hasta 8 MB, imágenes hasta 4 MB).
      </p>
      <ul className="space-y-3">
        {ordenados.map((d) => (
          <DocumentoUploader
            key={d.tipo}
            expedienteId={expediente.id}
            tipo={d.tipo}
            etiqueta={d.etiqueta}
            obligatorio={requeridos.includes(d.tipo)}
            documento={documentos.find((x) => x.tipo === d.tipo)}
          />
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
