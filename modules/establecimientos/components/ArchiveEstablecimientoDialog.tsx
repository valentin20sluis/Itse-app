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
import { archiveEstablecimientoAction } from "@/modules/establecimientos/actions/establecimiento.actions";
import type { Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";

type Props = {
  establecimiento: Establecimiento | null;
  onClose: () => void;
};

export function ArchiveEstablecimientoDialog({ establecimiento, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setError(null);
    onClose();
  }

  function confirm() {
    if (!establecimiento) return;
    startTransition(async () => {
      const result = await archiveEstablecimientoAction.bind(null, establecimiento.id)();
      if (result.ok) close();
      else setError(result.error);
    });
  }

  return (
    <AlertDialog
      open={establecimiento !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Archivar este establecimiento?</AlertDialogTitle>
          <AlertDialogDescription>
            Se archivará «{establecimiento?.nombreComercial}» y dejará de aparecer en tu
            lista.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11" disabled={pending}>
            Cancelar
          </AlertDialogCancel>
          <Button variant="destructive" className="h-11" onClick={confirm} disabled={pending}>
            {pending ? "Archivando…" : "Archivar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
