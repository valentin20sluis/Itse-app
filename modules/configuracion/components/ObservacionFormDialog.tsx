"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  crearObservacionAction,
  editarObservacionAction,
} from "@/modules/configuracion/actions/catalogo.actions";
import type { ObservacionItem } from "@/modules/configuracion/types/configuracion.types";

// Sin `observacion` agrega una nueva; con `observacion` solo se cambia la descripción.
export function ObservacionFormDialog({ observacion }: { observacion?: ObservacionItem }) {
  const [open, setOpen] = useState(false);
  const [intento, setIntento] = useState(0);

  const abrir = () => {
    setIntento((n) => n + 1);
    setOpen(true);
  };

  return (
    <>
      {observacion ? (
        <Button
          variant="outline"
          className="h-11"
          aria-label={`Editar la observación ${observacion.descripcion}`}
          onClick={abrir}
        >
          Editar
        </Button>
      ) : (
        <Button className="h-11" onClick={abrir}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Agregar observación
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <FormBody key={intento} observacion={observacion} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function FormBody({ observacion, onDone }: { observacion?: ObservacionItem; onDone: () => void }) {
  const id = useId();
  const [descripcion, setDescripcion] = useState(observacion?.descripcion ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const r = observacion
        ? await editarObservacionAction(observacion.id, datos)
        : await crearObservacionAction(datos);
      if (r.ok) {
        onDone();
        return;
      }
      if (r.fieldErrors && Object.keys(r.fieldErrors).length > 0) setFieldErrors(r.fieldErrors);
      else setError(r.error);
    });
  }

  const errorDescripcion = fieldErrors.descripcion?.[0];

  return (
    <>
      <DialogHeader>
        <DialogTitle>{observacion ? "Editar observación" : "Agregar observación"}</DialogTitle>
        <DialogDescription>
          {observacion
            ? "Los expedientes que ya tienen esta observación conservan el texto anterior."
            : "Se ofrecerá como observación no relevante al registrar el resultado de una inspección."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-descripcion`}>Descripción de la observación</Label>
          <Textarea
            id={`${id}-descripcion`}
            name="descripcion"
            maxLength={200}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
            aria-required="true"
            className="min-h-24"
            aria-invalid={errorDescripcion ? true : undefined}
            aria-describedby={errorDescripcion ? `${id}-descripcion-error` : undefined}
          />
          {errorDescripcion && (
            <p id={`${id}-descripcion-error`} className="text-sm text-destructive">
              {errorDescripcion}
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <DialogClose render={<Button type="button" variant="outline" className="h-11" />}>Cancelar</DialogClose>
          <Button type="submit" disabled={pending} className="h-11 px-6">
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </>
  );
}
