"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { reenviarRequisitosAction } from "@/modules/expedientes/actions/transicion.actions";
import { DocumentoUploader } from "@/modules/expedientes/components/DocumentoUploader";
import type { ExpedienteDetalle } from "@/modules/expedientes/types/bandeja.types";
import { DOCUMENTOS, documentosOpcionales, documentosRequeridos } from "@/modules/expedientes/utils/documentos";
import { ultimaObservacion } from "@/modules/expedientes/utils/observacion";

export function SubsanacionRequisitos({ detalle }: { detalle: ExpedienteDetalle }) {
  const { expediente: e, establecimiento, documentos, historial } = detalle;
  const [state, action, pending] = useActionState(reenviarRequisitosAction.bind(null, e.id), null);
  const contexto = { ...e, numeroPisos: establecimiento.numeroPisos };
  const requeridos = documentosRequeridos(contexto);
  const opcionales = documentosOpcionales(contexto);
  const lista = DOCUMENTOS.filter((d) => requeridos.includes(d.tipo) || opcionales.includes(d.tipo));
  const motivo = ultimaObservacion(historial);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-medium">Corrige tu solicitud</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {motivo && (
          <div role="status" className="rounded-lg border bg-muted p-3 text-sm">
            <p className="font-medium">Motivo de la observación</p>
            <p className="mt-1 break-words whitespace-pre-wrap">{motivo}</p>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Reemplaza o completa los documentos que correspondan (PDF hasta 8 MB, imágenes hasta 4 MB) y
          reenvía la solicitud.
        </p>
        <ul className="space-y-3">
          {lista.map((d) => (
            <DocumentoUploader
              key={d.tipo}
              expedienteId={e.id}
              tipo={d.tipo}
              etiqueta={d.etiqueta}
              obligatorio={requeridos.includes(d.tipo)}
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
          <Button type="submit" className="h-11 px-6" disabled={pending}>
            {pending ? "Enviando…" : "Reenviar solicitud"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
