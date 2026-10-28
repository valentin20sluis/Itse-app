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
import { setObservacionActivaAction } from "@/modules/configuracion/actions/catalogo.actions";
import type { ObservacionItem } from "@/modules/configuracion/types/configuracion.types";

// Desactivar pide confirmación; reactivar es reversible y se aplica directo.
export function ToggleObservacionDialog({ observacion }: { observacion: ObservacionItem }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cambiar(activa: boolean) {
    setError(null);
    startTransition(async () => {
      const r = await setObservacionActivaAction(observacion.id, activa);
      if (r.ok) setOpen(false);
      else setError(r.error);
    });
  }

  if (!observacion.activo) {
    return (
      <div className="flex flex-col gap-1">
        <Button
          variant="outline"
          className="h-11"
          disabled={pending}
          aria-label={`Reactivar la observación ${observacion.descripcion}`}
          onClick={() => cambiar(true)}
        >
          {pending ? "Reactivando…" : "Reactivar"}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-11 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Desactivar la observación ${observacion.descripcion}`}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Desactivar
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar esta observación?</AlertDialogTitle>
            <AlertDialogDescription>
              Dejará de ofrecerse en nuevas diligencias. Los expedientes que ya la tienen no cambian.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="break-words text-sm font-medium">{observacion.descripcion}</p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11" disabled={pending}>
              Cancelar
            </AlertDialogCancel>
            <Button variant="destructive" className="h-11" onClick={() => cambiar(false)} disabled={pending}>
              {pending ? "Desactivando…" : "Desactivar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
