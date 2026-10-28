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
import type { Inspector } from "@/db/schema";
import { setInspectorActivoAction } from "@/modules/inspecciones/actions/inspector.actions";

type Props = {
  inspector: Inspector | null;
  onClose: () => void;
};

export function ToggleInspectorDialog({ inspector, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setError(null);
    onClose();
  }

  function confirm() {
    if (!inspector) return;
    startTransition(async () => {
      const result = await setInspectorActivoAction(inspector.id, false);
      if (result.ok) close();
      else setError(result.error);
    });
  }

  return (
    <AlertDialog
      open={inspector !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Desactivar este inspector?</AlertDialogTitle>
          <AlertDialogDescription>
            Dejará de aparecer al designar inspectores. Podrás reactivarlo.
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
            {pending ? "Desactivando…" : "Desactivar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
