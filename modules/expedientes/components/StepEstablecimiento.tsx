"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { saveBorradorAction } from "@/modules/expedientes/actions/expediente.actions";
import type { Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";
import type { Expediente, TipoTramite } from "@/modules/expedientes/types/expediente.types";

const TRAMITES: { valor: TipoTramite; etiqueta: string }[] = [
  { valor: "NUEVA", etiqueta: "ITSE nueva" },
  { valor: "RENOVACION", etiqueta: "Renovación" },
];

const OPCION =
  "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-input p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring";

type Props = {
  establecimientos: Establecimiento[];
  expediente: Expediente | null;
  onSaved: (expediente: Expediente) => void;
};

export function StepEstablecimiento({ establecimientos, expediente, onSaved }: Props) {
  const [state, action, pending] = useActionState<ActionResult<Expediente> | null, FormData>(
    async (prev, formData) => {
      const res = await saveBorradorAction(1, expediente?.id ?? null, prev, formData);
      if (res.ok) onSaved(res.data);
      return res;
    },
    null,
  );
  const [establecimientoId, setEstablecimientoId] = useState(expediente?.establecimientoId ?? "");
  const [tipoTramite, setTipoTramite] = useState<string>(expediente?.tipoTramite ?? "");

  if (establecimientos.length === 0) {
    return (
      <div className="space-y-3 text-sm">
        <p>Primero registra el establecimiento donde se realizará la inspección.</p>
        <Link
          href="/mi-cuenta/establecimientos"
          className={buttonVariants({ className: "h-11 px-4" })}
        >
          Registrar establecimiento
        </Link>
      </div>
    );
  }

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const errorEst = fieldErrors.establecimientoId?.[0];
  const errorTramite = fieldErrors.tipoTramite?.[0];
  const generalError =
    state && !state.ok && Object.keys(fieldErrors).length === 0 ? state.error : null;

  return (
    <form action={action} className="space-y-6" noValidate>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Establecimiento</legend>
        {establecimientos.map((e) => (
          <label key={e.id} className={OPCION}>
            <input
              type="radio"
              name="establecimientoId"
              value={e.id}
              checked={establecimientoId === e.id}
              onChange={() => setEstablecimientoId(e.id)}
              aria-describedby={errorEst ? "establecimientoId-error" : undefined}
              className="mt-0.5 size-5 shrink-0 accent-primary"
            />
            <span className="min-w-0">
              <span className="block font-medium">{e.nombreComercial}</span>
              <span className="block break-words text-muted-foreground">{e.direccion}</span>
              <span className="block text-muted-foreground">
                {e.areaM2} m² · {e.numeroPisos} {e.numeroPisos === 1 ? "piso" : "pisos"}
              </span>
            </span>
          </label>
        ))}
        {errorEst && (
          <p id="establecimientoId-error" className="text-sm text-destructive">
            {errorEst}
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Tipo de trámite</legend>
        {TRAMITES.map((t) => (
          <label key={t.valor} className={OPCION}>
            <input
              type="radio"
              name="tipoTramite"
              value={t.valor}
              checked={tipoTramite === t.valor}
              onChange={() => setTipoTramite(t.valor)}
              aria-describedby={errorTramite ? "tipoTramite-error" : undefined}
              className="size-5 shrink-0 accent-primary"
            />
            <span>{t.etiqueta}</span>
          </label>
        ))}
        {errorTramite && (
          <p id="tipoTramite-error" className="text-sm text-destructive">
            {errorTramite}
          </p>
        )}
      </fieldset>

      {generalError && (
        <p role="alert" className="text-sm text-destructive">
          {generalError}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" className="h-11 px-6" disabled={pending}>
          {pending ? "Guardando…" : "Siguiente"}
        </Button>
      </div>
    </form>
  );
}
