"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { designarInspectoresAction } from "@/modules/inspecciones/actions/designacion.actions";
import type { InspectorElegible } from "@/modules/inspecciones/services/designacion.service";

type Props = {
  expedienteId: string;
  requeridos: number;
  candidatos: InspectorElegible[];
};

export function DesignarInspectoresForm({ expedienteId, requeridos, candidatos }: Props) {
  const uid = useId();
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [state, action, pending] = useActionState<ActionResult<null> | null, FormData>(
    designarInspectoresAction.bind(null, expedienteId),
    null,
  );

  if (candidatos.length < requeridos) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Designar inspectores</h3>
        <p role="alert" className="text-sm text-destructive">
          No hay suficientes inspectores activos para este nivel de riesgo.
        </p>
        <Link href="/panel/inspectores" className={buttonVariants({ variant: "outline", className: "h-11" })}>
          Ir a inspectores
        </Link>
      </div>
    );
  }

  const toggle = (id: string, marcado: boolean) =>
    setElegidos((prev) => (marcado ? [...prev, id] : prev.filter((x) => x !== id)));

  return (
    <form action={action} className="space-y-3">
      <h3 className="font-medium">Designar inspectores</h3>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Inspectores (elige {requeridos})</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {candidatos.map((c) => {
            const marcado = elegidos.includes(c.id);
            return (
              <label
                key={c.id}
                htmlFor={`${uid}-${c.id}`}
                className="flex min-h-11 min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-input px-3 py-2 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
              >
                <input
                  id={`${uid}-${c.id}`}
                  type="checkbox"
                  name="inspectorIds"
                  value={c.id}
                  checked={marcado}
                  disabled={!marcado && elegidos.length >= requeridos}
                  onChange={(e) => toggle(c.id, e.target.checked)}
                  className="size-5 shrink-0 accent-primary"
                />
                <span className="min-w-0 break-words text-sm">
                  {c.nombre}
                  <span className="block text-muted-foreground">Doc. {c.documento}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <p aria-live="polite" className="text-sm">
        Elegidos: {elegidos.length} de {requeridos}
      </p>
      <p className="text-sm text-muted-foreground">La designación no se podrá cambiar en esta etapa.</p>
      <p role="alert" className="text-sm text-destructive">
        {state && !state.ok ? state.error : null}
      </p>
      <Button type="submit" className="h-11" disabled={pending || elegidos.length !== requeridos}>
        {pending ? "Guardando…" : "Designar"}
      </Button>
    </form>
  );
}
