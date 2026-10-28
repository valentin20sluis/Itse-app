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
import { eliminarFeriadoAction } from "@/modules/configuracion/actions/feriado.actions";
import type { FeriadoItem } from "@/modules/configuracion/services/feriado-gestion.service";
import { fechaCorta } from "@/modules/configuracion/utils/auditoria-texto";

export function EliminarFeriadoDialog({ feriado }: { feriado: FeriadoItem }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cerrar() {
    setError(null);
    setOpen(false);
  }

  function confirmar() {
    startTransition(async () => {
      const r = await eliminarFeriadoAction(feriado.fecha);
      if (r.ok) cerrar();
      else setError(r.error);
    });
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-11 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Eliminar el feriado ${feriado.nombre}`}
        onClick={() => setOpen(true)}
      >
        Eliminar
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(abierto) => {
          if (!abierto) cerrar();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este feriado?</AlertDialogTitle>
            <AlertDialogDescription>
              Se quitará “{feriado.nombre}” ({fechaCorta(feriado.fecha)}). Esto cambia el conteo de días hábiles
              de los plazos que están en curso.
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
            <Button variant="destructive" className="h-11" onClick={confirmar} disabled={pending}>
              {pending ? "Eliminando…" : "Eliminar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
