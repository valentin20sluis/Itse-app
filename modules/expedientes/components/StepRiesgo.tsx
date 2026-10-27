"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { saveBorradorAction } from "@/modules/expedientes/actions/expediente.actions";
import type { Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";
import type { Expediente, NivelRiesgo } from "@/modules/expedientes/types/expediente.types";
import { sugerirNivelRiesgo, tipoItsePorRiesgo } from "@/modules/expedientes/utils/riesgo";

const NIVELES: { valor: NivelRiesgo; etiqueta: string }[] = [
  { valor: "BAJO", etiqueta: "Riesgo bajo" },
  { valor: "MEDIO", etiqueta: "Riesgo medio" },
  { valor: "ALTO", etiqueta: "Riesgo alto" },
  { valor: "MUY_ALTO", etiqueta: "Riesgo muy alto" },
];

const OPCION =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-input p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring";

type Props = {
  establecimiento: Establecimiento;
  expediente: Expediente;
  onSaved: (expediente: Expediente) => void;
  onBack: () => void;
};

export function StepRiesgo({ establecimiento, expediente, onSaved, onBack }: Props) {
  const [state, action, pending] = useActionState<ActionResult<Expediente> | null, FormData>(
    async (prev, formData) => {
      const res = await saveBorradorAction(2, expediente.id, prev, formData);
      if (res.ok) onSaved(res.data);
      return res;
    },
    null,
  );
  const [tieneSotano, setTieneSotano] = useState(expediente.tieneSotano);
  const [almacenaInflamables, setAlmacenaInflamables] = useState(expediente.almacenaInflamables);
  const [nivel, setNivel] = useState<string>(expediente.nivelRiesgo ?? "");

  const sugerido = sugerirNivelRiesgo({
    areaM2: Number(establecimiento.areaM2),
    numeroPisos: establecimiento.numeroPisos,
    tieneSotano,
    almacenaInflamables,
  });
  const etiquetaSugerido = NIVELES.find((n) => n.valor === sugerido)?.etiqueta;
  const elegido = NIVELES.find((n) => n.valor === nivel);

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const errorNivel = fieldErrors.nivelRiesgo?.[0];
  const generalError =
    state && !state.ok && Object.keys(fieldErrors).length === 0 ? state.error : null;

  return (
    <form action={action} className="space-y-6" noValidate>
      <p className="text-sm text-muted-foreground">
        {establecimiento.nombreComercial}: {establecimiento.areaM2} m² · {establecimiento.numeroPisos}{" "}
        {establecimiento.numeroPisos === 1 ? "piso" : "pisos"} de la edificación
      </p>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Características del local</legend>
        <label className={OPCION}>
          <input
            type="checkbox"
            name="tieneSotano"
            value="on"
            checked={tieneSotano}
            onChange={(e) => setTieneSotano(e.target.checked)}
            className="size-5 shrink-0 accent-primary"
          />
          <span>¿Tiene sótano?</span>
        </label>
        <label className={OPCION}>
          <input
            type="checkbox"
            name="almacenaInflamables"
            value="on"
            checked={almacenaInflamables}
            onChange={(e) => setAlmacenaInflamables(e.target.checked)}
            className="size-5 shrink-0 accent-primary"
          />
          <span>¿Almacena inflamables?</span>
        </label>
      </fieldset>

      <div className="space-y-1 rounded-lg bg-muted p-3 text-sm" aria-live="polite">
        <p className="font-medium">Sugerencia: {etiquetaSugerido}</p>
        <p className="text-muted-foreground">
          Es solo una orientación. GRDyDC confirmará el nivel de riesgo.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Nivel de riesgo que declaras</legend>
        {NIVELES.map((n) => (
          <label key={n.valor} className={OPCION}>
            <input
              type="radio"
              name="nivelRiesgo"
              value={n.valor}
              checked={nivel === n.valor}
              onChange={() => setNivel(n.valor)}
              aria-describedby={errorNivel ? "nivelRiesgo-error" : undefined}
              className="size-5 shrink-0 accent-primary"
            />
            <span>{n.etiqueta}</span>
          </label>
        ))}
        {errorNivel && (
          <p id="nivelRiesgo-error" className="text-sm text-destructive">
            {errorNivel}
          </p>
        )}
        {elegido && (
          <p className="text-sm" aria-live="polite">
            Tipo de ITSE: <strong>{tipoItsePorRiesgo(elegido.valor) === "PREVIA" ? "Previa" : "Posterior"}</strong>
          </p>
        )}
      </fieldset>

      {generalError && (
        <p role="alert" className="text-sm text-destructive">
          {generalError}
        </p>
      )}
      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="outline" className="h-11 px-4" onClick={onBack} disabled={pending}>
          Atrás
        </Button>
        <Button type="submit" className="h-11 px-6" disabled={pending}>
          {pending ? "Guardando…" : "Siguiente"}
        </Button>
      </div>
    </form>
  );
}
