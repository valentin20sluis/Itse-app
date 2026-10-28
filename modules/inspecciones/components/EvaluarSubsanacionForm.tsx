"use client";

import { useActionState, useId, useRef, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { evaluarSubsanacionAction } from "@/modules/inspecciones/actions/subsanacion.actions";
import type { OpcionEvaluacion } from "@/modules/inspecciones/utils/subsanacion";

const LABELS: Record<OpcionEvaluacion, string> = {
  CUMPLE: "Cumple",
  SIGUE_EN_SUBSANACION: "Sigue en subsanación",
  NO_CUMPLE: "No cumple",
};

type Props = {
  expedienteId: string;
  // Solo las opciones que el servidor aceptaría (opcionesEvaluacion).
  opciones: readonly OpcionEvaluacion[];
};

export function EvaluarSubsanacionForm({ expedienteId, opciones }: Props) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [state, action, pending] = useActionState<ActionResult<null> | null, FormData>(
    evaluarSubsanacionAction.bind(null, expedienteId),
    null,
  );
  const err = (campo: string) => (state && !state.ok ? state.fieldErrors?.[campo]?.[0] : undefined);

  return (
    <form ref={formRef} id={uid} action={action} className="space-y-3">
      <h3 className="font-medium">Evaluar la subsanación</h3>
      <fieldset
        className="space-y-2"
        aria-describedby={err("resultado") ? `${uid}-res-err` : undefined}
      >
        <legend className="mb-2 text-sm font-medium">Resultado</legend>
        <div className="flex flex-col gap-2 sm:flex-row">
          {opciones.map((o) => (
            <label
              key={o}
              htmlFor={`${uid}-${o}`}
              className="flex min-h-11 min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-input px-3 py-2 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 sm:flex-1"
            >
              <input
                id={`${uid}-${o}`}
                type="radio"
                name="resultado"
                value={o}
                required
                className="size-5 shrink-0 accent-primary"
              />
              <span className="text-sm">{LABELS[o]}</span>
            </label>
          ))}
        </div>
        {err("resultado") && (
          <p id={`${uid}-res-err`} className="text-sm text-destructive">
            {err("resultado")}
          </p>
        )}
      </fieldset>
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-informe`}>Informe</Label>
        <Textarea
          id={`${uid}-informe`}
          name="informe"
          required
          aria-required
          minLength={10}
          maxLength={1000}
          aria-invalid={err("informe") ? true : undefined}
          aria-describedby={err("informe") ? `${uid}-informe-err` : undefined}
          className="min-h-28"
        />
        {err("informe") && (
          <p id={`${uid}-informe-err`} className="text-sm text-destructive">
            {err("informe")}
          </p>
        )}
        <p className="text-sm text-muted-foreground">El solicitante verá este informe.</p>
      </div>
      <p role="alert" className="text-sm text-destructive">
        {state && !state.ok ? state.error : null}
      </p>
      <Button
        type="button"
        className="h-11"
        disabled={pending}
        onClick={() => formRef.current?.reportValidity() && setConfirmar(true)}
      >
        {pending ? "Guardando…" : "Registrar evaluación"}
      </Button>
      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Registrar la evaluación?</AlertDialogTitle>
            <AlertDialogDescription>
              El solicitante verá el resultado y el informe. «Cumple» y «No cumple» no se pueden deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
            <Button type="submit" form={uid} className="h-11" onClick={() => setConfirmar(false)}>
              Sí, registrar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
