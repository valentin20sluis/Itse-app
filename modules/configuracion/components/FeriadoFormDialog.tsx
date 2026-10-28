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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearFeriadoAction, editarFeriadoAction } from "@/modules/configuracion/actions/feriado.actions";
import type { FeriadoItem } from "@/modules/configuracion/services/feriado-gestion.service";
import { fechaCorta } from "@/modules/configuracion/utils/auditoria-texto";

// Sin `feriado` crea uno nuevo; con `feriado` solo se cambia el nombre (la fecha es la clave).
export function FeriadoFormDialog({ feriado }: { feriado?: FeriadoItem }) {
  const [open, setOpen] = useState(false);
  const [intento, setIntento] = useState(0);

  return (
    <>
      {feriado ? (
        <Button
          variant="outline"
          className="h-11"
          aria-label={`Cambiar nombre del feriado ${feriado.nombre}`}
          onClick={() => {
            setIntento((n) => n + 1);
            setOpen(true);
          }}
        >
          Cambiar nombre
        </Button>
      ) : (
        <Button
          className="h-11"
          onClick={() => {
            setIntento((n) => n + 1);
            setOpen(true);
          }}
        >
          <Plus data-icon="inline-start" aria-hidden="true" />
          Agregar feriado
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <FormBody key={intento} feriado={feriado} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function FormBody({ feriado, onDone }: { feriado?: FeriadoItem; onDone: () => void }) {
  const id = useId();
  const [fecha, setFecha] = useState("");
  const [nombre, setNombre] = useState(feriado?.nombre ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const r = feriado ? await editarFeriadoAction(feriado.fecha, datos) : await crearFeriadoAction(datos);
      if (r.ok) {
        onDone();
        return;
      }
      if (r.fieldErrors && Object.keys(r.fieldErrors).length > 0) setFieldErrors(r.fieldErrors);
      else setError(r.error);
    });
  }

  const errorFecha = fieldErrors.fecha?.[0];
  const errorNombre = fieldErrors.nombre?.[0];

  return (
    <>
      <DialogHeader>
        <DialogTitle>{feriado ? "Cambiar nombre del feriado" : "Agregar feriado"}</DialogTitle>
        <DialogDescription>
          {feriado
            ? "La fecha no se puede cambiar. Si te equivocaste de fecha, elimina el feriado y agrégalo otra vez."
            : "Los días feriados no cuentan en los plazos de subsanación."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-fecha`}>Fecha</Label>
          {feriado ? (
            <Input id={`${id}-fecha`} value={fechaCorta(feriado.fecha)} readOnly className="h-11" />
          ) : (
            <Input
              id={`${id}-fecha`}
              name="fecha"
              type="date"
              min="2020-01-01"
              max="2100-12-31"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              aria-required="true"
              className="h-11"
              aria-invalid={errorFecha ? true : undefined}
              aria-describedby={errorFecha ? `${id}-fecha-error` : undefined}
            />
          )}
          {errorFecha && (
            <p id={`${id}-fecha-error`} className="text-sm text-destructive">
              {errorFecha}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-nombre`}>Nombre del feriado</Label>
          <Input
            id={`${id}-nombre`}
            name="nombre"
            autoComplete="off"
            maxLength={80}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            aria-required="true"
            className="h-11"
            aria-invalid={errorNombre ? true : undefined}
            aria-describedby={errorNombre ? `${id}-nombre-error` : undefined}
          />
          {errorNombre && (
            <p id={`${id}-nombre-error`} className="text-sm text-destructive">
              {errorNombre}
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
