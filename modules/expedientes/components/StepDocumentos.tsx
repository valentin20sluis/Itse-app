"use client";

import { Button } from "@/components/ui/button";
import { DocumentoUploader } from "@/modules/expedientes/components/DocumentoUploader";
import type { Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";
import type { Expediente, ExpedienteDocumento } from "@/modules/expedientes/types/expediente.types";
import {
  DOCUMENTOS,
  documentosOpcionales,
  documentosRequeridos,
} from "@/modules/expedientes/utils/documentos";

type Props = {
  expediente: Expediente;
  establecimiento: Establecimiento;
  documentos: ExpedienteDocumento[];
  onNext: () => void;
  onBack: () => void;
};

export function StepDocumentos({ expediente, establecimiento, documentos, onNext, onBack }: Props) {
  const contexto = { ...expediente, numeroPisos: establecimiento.numeroPisos };
  const requeridos = documentosRequeridos(contexto);
  const opcionales = documentosOpcionales(contexto);
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
