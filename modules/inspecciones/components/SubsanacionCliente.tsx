"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DocumentoUploader } from "@/modules/expedientes/components/DocumentoUploader";
import type { ExpedienteDocumento } from "@/modules/expedientes/types/expediente.types";
import { DOCUMENTOS_SUBSANACION } from "@/modules/expedientes/utils/documentos";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";
import { presentarSubsanacionAction } from "@/modules/inspecciones/actions/subsanacion.actions";
import type { TipoItse } from "@/modules/inspecciones/utils/plazo-subsanacion";

type Props = {
  expedienteId: string;
  tipoItse: TipoItse;
  documentos: ExpedienteDocumento[];
  presentadaAt: Date | null;
  // Calculado con puedeSubirEvidencia (posterior, sin presentar y con plazo vigente).
  puedeSubir: boolean;
  reprogramadaPara: Date | null;
};

export function SubsanacionCliente({
  expedienteId,
  tipoItse,
  documentos,
  presentadaAt,
  puedeSubir,
  reprogramadaPara,
}: Props) {
  const [state, action, pending] = useActionState(presentarSubsanacionAction.bind(null, expedienteId), null);
  const completo = DOCUMENTOS_SUBSANACION.every((d) => documentos.some((x) => x.tipo === d.tipo));

  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-medium">Subsanación</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {tipoItse === "PREVIA" ? (
          <p className="text-sm">
            {reprogramadaPara
              ? `La inspección se reprogramó para el ${formatFecha(reprogramadaPara)}. `
              : "La inspección se reprogramará. "}
            Los inspectores volverán: no necesitas subir archivos.
          </p>
        ) : presentadaAt ? (
          <p role="status" className="text-sm">
            Presentada el {formatFecha(presentadaAt)}. Estamos evaluándola.
          </p>
        ) : !puedeSubir ? (
          <p role="status" className="text-sm">
            El plazo venció. Ya no puedes subir archivos.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Sube una declaración jurada y un panel fotográfico con una leyenda que muestre cómo corregiste
              cada observación.
            </p>
            <ul className="space-y-3">
              {DOCUMENTOS_SUBSANACION.map((d) => (
                <DocumentoUploader
                  key={d.tipo}
                  expedienteId={expedienteId}
                  tipo={d.tipo}
                  etiqueta={d.etiqueta}
                  obligatorio
                  documento={documentos.find((x) => x.tipo === d.tipo)}
                />
              ))}
            </ul>
            <form action={action} className="space-y-2">
              {state && !state.ok && (
                <p role="alert" className="text-sm text-destructive">
                  {state.error}
                </p>
              )}
              <Button type="submit" className="h-11 px-6" disabled={!completo || pending}>
                {pending ? "Presentando…" : "Presentar subsanación"}
              </Button>
              {!completo && (
                <p className="text-sm text-muted-foreground">
                  Sube los dos archivos para poder presentar.
                </p>
              )}
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
