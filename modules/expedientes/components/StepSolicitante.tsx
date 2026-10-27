"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action-result";
import { saveBorradorAction } from "@/modules/expedientes/actions/expediente.actions";
import type { Expediente } from "@/modules/expedientes/types/expediente.types";

export type DefaultsSolicitante = {
  nombre: string;
  documento: string;
  telefono: string;
  email: string;
};

type FieldName =
  | "solicitanteNombre"
  | "solicitanteDocumento"
  | "solicitanteTelefono"
  | "solicitanteEmail";

const FIELDS: {
  name: FieldName;
  label: string;
  type?: string;
  inputMode?: "numeric" | "tel" | "email";
  autoComplete?: string;
}[] = [
  { name: "solicitanteDocumento", label: "DNI", inputMode: "numeric" },
  { name: "solicitanteNombre", label: "Nombres y apellidos", autoComplete: "name" },
  { name: "solicitanteTelefono", label: "Teléfono", type: "tel", inputMode: "tel", autoComplete: "tel" },
  { name: "solicitanteEmail", label: "Correo electrónico", type: "email", inputMode: "email", autoComplete: "email" },
];

type Props = {
  expediente: Expediente;
  defaults: DefaultsSolicitante;
  onSaved: (expediente: Expediente) => void;
  onBack: () => void;
};

export function StepSolicitante({ expediente, defaults, onSaved, onBack }: Props) {
  const [state, action, pending] = useActionState<ActionResult<Expediente> | null, FormData>(
    async (prev, formData) => {
      const res = await saveBorradorAction(3, expediente.id, prev, formData);
      if (res.ok) onSaved(res.data);
      return res;
    },
    null,
  );
  const [values, setValues] = useState<Record<FieldName, string>>({
    solicitanteNombre: expediente.solicitanteNombre ?? defaults.nombre,
    solicitanteDocumento: expediente.solicitanteDocumento ?? defaults.documento,
    solicitanteTelefono: expediente.solicitanteTelefono ?? defaults.telefono,
    solicitanteEmail: expediente.solicitanteEmail ?? defaults.email,
  });

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const generalError =
    state && !state.ok && Object.keys(fieldErrors).length === 0 ? state.error : null;

  const campo = (name: FieldName, label: string, extra: Partial<(typeof FIELDS)[number]> = {}) => {
    const error = fieldErrors[name]?.[0];
    return (
      <div key={name} className="flex flex-col gap-1.5">
        <Label htmlFor={name}>{label}</Label>
        <Input
          id={name}
          name={name}
          type={extra.type}
          inputMode={extra.inputMode}
          autoComplete={extra.autoComplete}
          value={values[name]}
          onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
          className="h-11"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        {error && (
          <p id={`${name}-error`} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <form action={action} className="space-y-4" noValidate>
      {FIELDS.map((f) => campo(f.name, f.label, f))}

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
