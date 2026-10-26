"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ActionResult } from "@/lib/action-result";
import {
  createEstablecimientoAction,
  updateEstablecimientoAction,
} from "@/modules/establecimientos/actions/establecimiento.actions";
import type { Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";

type FieldName =
  | "nombreComercial"
  | "direccion"
  | "distrito"
  | "giro"
  | "areaM2"
  | "numeroPisos";

const FIELDS: {
  name: FieldName;
  label: string;
  inputMode?: "decimal" | "numeric";
  autoComplete?: string;
}[] = [
  { name: "nombreComercial", label: "Nombre comercial" },
  { name: "direccion", label: "Dirección", autoComplete: "street-address" },
  { name: "distrito", label: "Distrito" },
  { name: "giro", label: "Giro o actividad" },
  { name: "areaM2", label: "Área techada total (m²)", inputMode: "decimal" },
  { name: "numeroPisos", label: "Número de pisos", inputMode: "numeric" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  establecimiento?: Establecimiento;
};

export function EstablecimientoForm({ open, onOpenChange, establecimiento }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <FormBody
          establecimiento={establecimiento}
          onDone={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

function FormBody({
  establecimiento,
  onDone,
}: {
  establecimiento?: Establecimiento;
  onDone: () => void;
}) {
  const action = establecimiento
    ? updateEstablecimientoAction.bind(null, establecimiento.id)
    : createEstablecimientoAction;
  const [state, formAction, pending] = useActionState<
    ActionResult<Establecimiento> | null,
    FormData
  >(action, null);

  // Controlado: React 19 vacía los campos no controlados tras cada envío, también si hubo errores.
  const [values, setValues] = useState<Record<FieldName, string>>({
    nombreComercial: establecimiento?.nombreComercial ?? "",
    direccion: establecimiento?.direccion ?? "",
    distrito: establecimiento?.distrito ?? "",
    giro: establecimiento?.giro ?? "",
    areaM2: establecimiento?.areaM2 ?? "",
    numeroPisos: establecimiento ? String(establecimiento.numeroPisos) : "",
  });

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const generalError =
    state && !state.ok && Object.keys(fieldErrors).length === 0 ? state.error : null;

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {establecimiento ? "Editar establecimiento" : "Nuevo establecimiento"}
        </SheetTitle>
        <SheetDescription>
          Completa los datos del local donde se realizará la inspección.
        </SheetDescription>
      </SheetHeader>
      <form action={formAction} className="flex flex-1 flex-col gap-4 px-4 pb-4" noValidate>
        {FIELDS.map((f) => {
          const error = fieldErrors[f.name]?.[0];
          const errorId = `${f.name}-error`;
          return (
            <div key={f.name} className="flex flex-col gap-1.5">
              <Label htmlFor={f.name}>{f.label}</Label>
              <Input
                id={f.name}
                name={f.name}
                value={values[f.name]}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                inputMode={f.inputMode}
                autoComplete={f.autoComplete}
                required
                className="h-11"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
              />
              {error && (
                <p id={errorId} className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          );
        })}
        {generalError && (
          <p role="alert" className="text-sm text-destructive">
            {generalError}
          </p>
        )}
        <Button type="submit" disabled={pending} className="mt-auto h-11 w-full">
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </form>
    </>
  );
}
