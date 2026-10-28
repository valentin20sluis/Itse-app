"use client";

import { useState, useTransition } from "react";
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
import { anularBorradorAction } from "@/modules/expedientes/actions/expediente.actions";

type Props = { expedienteId: string; establecimientoNombre: string };

export function AnularBorradorButton({ expedienteId, establecimientoNombre }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await anularBorradorAction(expedienteId);
      if (result.ok) setOpen(false);
      else setError(result.error);
    });
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-11 flex-1"
        aria-label={`Anular solicitud de ${establecimientoNombre}`}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Anular
      </Button>
      <AlertDialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular esta solicitud?</AlertDialogTitle>
            <AlertDialogDescription>
              Se cancelará el borrador y podrás iniciar otra solicitud para este establecimiento.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p role="alert" aria-live="polite" className="text-sm text-destructive">
            {error}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11" disabled={pending}>
              Cancelar
            </AlertDialogCancel>
            <Button variant="destructive" className="h-11" onClick={confirm} disabled={pending}>
              {pending ? "Anulando…" : "Sí, anular"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
