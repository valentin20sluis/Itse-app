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
import { aprobarCertificadoAction } from "@/modules/certificados/actions/aprobacion.actions";

export function AprobarCertificadoButton({ expedienteId }: { expedienteId: string }) {
  const formId = useId();
  const [abierto, setAbierto] = useState(false);
  const [state, action, pending] = useActionState(aprobarCertificadoAction.bind(null, expedienteId), null);
  return (
    <form id={formId} action={action} className="space-y-2">
      <Button type="button" className="h-11" disabled={pending} onClick={() => setAbierto(true)}>
        {pending ? "Aprobando…" : "Aprobar certificado y generar resolución"}
      </Button>
      <p role="alert" aria-live="polite" className="text-sm text-destructive">
        {state && !state.ok ? state.error : null}
      </p>
      <AlertDialog open={abierto} onOpenChange={setAbierto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aprobar este certificado?</AlertDialogTitle>
            <AlertDialogDescription>
              Se fijará hoy como fecha de expedición, el certificado vencerá en 2 años y se generará la
              Resolución Gerencial. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
            <Button type="submit" form={formId} className="h-11" onClick={() => setAbierto(false)}>
              Sí, aprobar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
