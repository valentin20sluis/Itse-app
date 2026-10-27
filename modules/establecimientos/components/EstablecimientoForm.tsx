"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/action-result";
import {
  createEstablecimientoAction,
  updateEstablecimientoAction,
} from "@/modules/establecimientos/actions/establecimiento.actions";
import { FUNCION_LABELS, FUNCION_VALUES } from "@/modules/establecimientos/constants/funciones";
import type { Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";

type FieldName =
  | "razonSocial"
  | "ruc"
  | "nombreComercial"
  | "direccion"
  | "distrito"
  | "numeroGiro"
  | "funcion"
  | "giro"
  | "areaM2"
  | "numeroPisos"
  | "pisoEstablecimiento"
  | "numeroCamas";

const FIELDS: {
  name: FieldName;
  label: string;
  inputMode?: "decimal" | "numeric";
  autoComplete?: string;
  wide?: boolean;
}[] = [
  { name: "razonSocial", label: "Razón social", wide: true },
  { name: "ruc", label: "RUC", inputMode: "numeric" },
  { name: "nombreComercial", label: "Nombre comercial", wide: true },
  { name: "direccion", label: "Dirección", autoComplete: "street-address", wide: true },
  { name: "distrito", label: "Distrito" },
  { name: "numeroGiro", label: "Número de giro" },
  { name: "giro", label: "Giro o actividad", wide: true },
  { name: "funcion", label: "Función" },
  { name: "numeroCamas", label: "Número de camas o habitaciones", inputMode: "numeric" },
  { name: "areaM2", label: "Área techada total (m²)", inputMode: "decimal" },
  { name: "numeroPisos", label: "Número de pisos de la edificación", inputMode: "numeric" },
  { name: "pisoEstablecimiento", label: "Piso donde está el establecimiento", inputMode: "numeric" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  establecimiento?: Establecimiento;
};

export function EstablecimientoForm({ open, onOpenChange, establecimiento }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <FormBody
          establecimiento={establecimiento}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
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
    razonSocial: establecimiento?.razonSocial ?? "",
    ruc: establecimiento?.ruc ?? "",
    nombreComercial: establecimiento?.nombreComercial ?? "",
    direccion: establecimiento?.direccion ?? "",
    distrito: establecimiento?.distrito ?? "",
    numeroGiro: establecimiento?.numeroGiro ?? "",
    funcion: establecimiento?.funcion ?? "",
    giro: establecimiento?.giro ?? "",
    areaM2: establecimiento?.areaM2 ?? "",
    numeroPisos: establecimiento ? String(establecimiento.numeroPisos) : "",
    pisoEstablecimiento:
      establecimiento?.pisoEstablecimiento != null ? String(establecimiento.pisoEstablecimiento) : "",
    numeroCamas: establecimiento?.numeroCamas != null ? String(establecimiento.numeroCamas) : "",
  });

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const generalError =
    state && !state.ok && Object.keys(fieldErrors).length === 0 ? state.error : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {establecimiento ? "Editar establecimiento" : "Nuevo establecimiento"}
        </DialogTitle>
        <DialogDescription>
          Completa los datos del local donde se realizará la inspección.
        </DialogDescription>
      </DialogHeader>
      <form action={formAction} className="grid gap-4 sm:grid-cols-2" noValidate>
        {FIELDS.filter((f) => f.name !== "numeroCamas" || values.funcion === "HOSPEDAJE").map((f) => {
          const error = fieldErrors[f.name]?.[0];
          const errorId = `${f.name}-error`;
          return (
            <div key={f.name} className={`flex flex-col gap-1.5 ${f.wide ? "sm:col-span-2" : ""}`}>
              <Label htmlFor={f.name}>{f.label}</Label>
              {f.name === "funcion" ? (
                <select
                  id={f.name}
                  name={f.name}
                  value={values[f.name]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  required
                  className="h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                >
                  <option value="" disabled className="bg-background text-foreground">
                    Selecciona una función
                  </option>
                  {FUNCION_VALUES.map((v) => (
                    <option key={v} value={v} className="bg-background text-foreground">
                      {FUNCION_LABELS[v]}
                    </option>
                  ))}
                </select>
              ) : (
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
              )}
              {error && (
                <p id={errorId} className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          );
        })}
        {generalError && (
          <p role="alert" className="text-sm text-destructive sm:col-span-2">
            {generalError}
          </p>
        )}
        <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
          <DialogClose render={<Button type="button" variant="outline" className="h-11" />}>
            Cancelar
          </DialogClose>
          <Button type="submit" disabled={pending} className="h-11 px-6">
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </>
  );
}
