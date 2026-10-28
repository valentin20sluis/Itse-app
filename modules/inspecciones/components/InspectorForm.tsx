"use client";

import { useActionState, useEffect, useState } from "react";
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
import type { Inspector } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import {
  crearInspectorAction,
  editarInspectorAction,
} from "@/modules/inspecciones/actions/inspector.actions";
import {
  PROFESION_LABELS,
  PROFESION_VALUES,
} from "@/modules/inspecciones/constants/profesiones";

type InputName = "nombres" | "apellidos" | "documento" | "telefono" | "email";
type FieldName = InputName | "profesion";

const FIELDS: {
  name: InputName;
  label: string;
  type?: string;
  inputMode?: "numeric" | "tel" | "email";
  autoComplete?: string;
}[] = [
  { name: "nombres", label: "Nombres", autoComplete: "off" },
  { name: "apellidos", label: "Apellidos", autoComplete: "off" },
  { name: "documento", label: "Documento (DNI o CIP)", inputMode: "numeric", autoComplete: "off" },
  { name: "telefono", label: "Teléfono", type: "tel", inputMode: "tel", autoComplete: "off" },
  { name: "email", label: "Correo electrónico", type: "email", inputMode: "email", autoComplete: "off" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspector?: Inspector;
};

export function InspectorForm({ open, onOpenChange, inspector }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <FormBody inspector={inspector} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FormBody({ inspector, onDone }: { inspector?: Inspector; onDone: () => void }) {
  const action = inspector
    ? editarInspectorAction.bind(null, inspector.id)
    : crearInspectorAction;
  const [state, formAction, pending] = useActionState<ActionResult<Inspector> | null, FormData>(
    action,
    null,
  );

  // Controlado: React 19 vacía los campos no controlados tras cada envío, también si hubo errores.
  const [values, setValues] = useState<Record<FieldName, string>>({
    nombres: inspector?.nombres ?? "",
    apellidos: inspector?.apellidos ?? "",
    documento: inspector?.documento ?? "",
    telefono: inspector?.telefono ?? "",
    email: inspector?.email ?? "",
    profesion: inspector?.profesion ?? "",
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
        <DialogTitle>{inspector ? "Editar inspector" : "Nuevo inspector"}</DialogTitle>
        <DialogDescription>
          Datos de la persona que realizará las diligencias de inspección.
        </DialogDescription>
      </DialogHeader>
      <form action={formAction} className="grid gap-4 sm:grid-cols-2" noValidate>
        {FIELDS.map((f) => {
          const error = fieldErrors[f.name]?.[0];
          const errorId = `${f.name}-error`;
          return (
            <div
              key={f.name}
              className={`flex flex-col gap-1.5 ${f.name === "email" ? "sm:col-span-2" : ""}`}
            >
              <Label htmlFor={f.name}>{f.label}</Label>
              <Input
                id={f.name}
                name={f.name}
                type={f.type}
                value={values[f.name]}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                inputMode={f.inputMode}
                autoComplete={f.autoComplete}
                required
                aria-required="true"
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
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="profesion">Profesión</Label>
          <select
            id="profesion"
            name="profesion"
            value={values.profesion}
            onChange={(e) => setValues((v) => ({ ...v, profesion: e.target.value }))}
            required
            className="h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
            aria-invalid={fieldErrors.profesion?.[0] ? true : undefined}
            aria-describedby={fieldErrors.profesion?.[0] ? "profesion-error" : undefined}
          >
            <option value="" disabled className="bg-background text-foreground">
              Selecciona una profesión
            </option>
            {PROFESION_VALUES.map((v) => (
              <option key={v} value={v} className="bg-background text-foreground">
                {PROFESION_LABELS[v]}
              </option>
            ))}
          </select>
          {fieldErrors.profesion?.[0] && (
            <p id="profesion-error" className="text-sm text-destructive">
              {fieldErrors.profesion[0]}
            </p>
          )}
        </div>
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
