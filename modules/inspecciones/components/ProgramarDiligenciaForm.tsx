"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action-result";
import { programarDiligenciaAction } from "@/modules/inspecciones/actions/diligencia.actions";

type Props = {
  expedienteId: string;
  direccion: string;
  // Hoy y hoy + 90 días en Lima (YYYY-MM-DD), calculados en el servidor.
  min: string;
  max: string;
};

export function ProgramarDiligenciaForm({ expedienteId, direccion, min, max }: Props) {
  const uid = useId();
  const [state, action, pending] = useActionState<ActionResult<null> | null, FormData>(
    programarDiligenciaAction.bind(null, expedienteId),
    null,
  );
  const campoError = state && !state.ok ? state.fieldErrors?.programadaPara?.[0] : undefined;

  return (
    <form action={action} className="space-y-3">
      <h3 className="font-medium">Programar diligencia</h3>
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-fecha`}>Fecha de la inspección</Label>
        <Input
          id={`${uid}-fecha`}
          name="programadaPara"
          type="date"
          required
          aria-required
          min={min}
          max={max}
          aria-invalid={campoError ? true : undefined}
          aria-describedby={campoError ? `${uid}-fecha-err` : `${uid}-fecha-ayuda`}
          className="h-11 sm:max-w-xs"
        />
        {campoError && (
          <p id={`${uid}-fecha-err`} className="text-sm text-destructive">
            {campoError}
          </p>
        )}
        <p id={`${uid}-fecha-ayuda`} className="text-sm text-muted-foreground">
          Desde hoy y hasta 90 días adelante (fecha de Lima).
        </p>
      </div>
      <p className="break-words text-sm">Lugar: {direccion}</p>
      <p role="alert" className="text-sm text-destructive">
        {state && !state.ok ? state.error : null}
      </p>
      <Button type="submit" className="h-11" disabled={pending}>
        {pending ? "Guardando…" : "Programar"}
      </Button>
    </form>
  );
}
