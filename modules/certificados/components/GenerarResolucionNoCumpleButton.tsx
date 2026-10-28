"use client";

import { useActionState, useId, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { generarResolucionNoCumpleAction } from "@/modules/certificados/actions/resolucion-no-cumple.actions";

export function GenerarResolucionNoCumpleButton({ expedienteId }: { expedienteId: string }) {
  const formId = useId();
  const [abierto, setAbierto] = useState(false);
  const [state, action, pending] = useActionState(
    generarResolucionNoCumpleAction.bind(null, expedienteId),
    null,
  );
  return (
    <form id={formId} action={action} className="space-y-2">
      <Button type="button" className="h-11" disabled={pending} onClick={() => setAbierto(true)}>
        {pending ? "Generando…" : "Generar resolución de no cumple"}
      </Button>
      <p role="alert" aria-live="polite" className="text-sm text-destructive">
        {state && !state.ok ? state.error : null}
      </p>
      <AlertDialog open={abierto} onOpenChange={setAbierto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Generar la resolución de no cumple?</AlertDialogTitle>
            <AlertDialogDescription>
              Se generará la Resolución de no cumple de este expediente. No se emitirá certificado y esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
            <Button type="submit" form={formId} className="h-11" onClick={() => setAbierto(false)}>
              Sí, generar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
