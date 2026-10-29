"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { guardarTasasAction } from "@/modules/configuracion/actions/tasa.actions";
import { HistorialCambios } from "@/modules/configuracion/components/HistorialCambios";
import { solesACentimos, tasasSchema } from "@/modules/configuracion/schemas/tasa.schema";
import type { AuditoriaConfigItem } from "@/modules/configuracion/services/auditoria-configuracion.service";
import type { Tasas } from "@/modules/expedientes/constants/tasa";

type Campo = "posterior" | "previa";

const CAMPOS: { campo: Campo; tipo: keyof Tasas; etiqueta: string }[] = [
  { campo: "posterior", tipo: "POSTERIOR", etiqueta: "Riesgo bajo y medio (ITSE posterior)" },
  { campo: "previa", tipo: "PREVIA", etiqueta: "Riesgo alto y muy alto (ITSE previa)" },
];

const soles = (centimos: number) => `S/ ${(centimos / 100).toFixed(2)}`;

const comoTexto = (t: Tasas): Record<Campo, string> => ({
  posterior: (t.POSTERIOR / 100).toFixed(2),
  previa: (t.PREVIA / 100).toFixed(2),
});

export function TasasForm({ tasas, historial }: { tasas: Tasas; historial: AuditoriaConfigItem[] }) {
  const id = useId();
  const [vigentes, setVigentes] = useState(tasas);
  const [valores, setValores] = useState(() => comoTexto(tasas));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const modificados = CAMPOS.filter((c) => solesACentimos(valores[c.campo]) !== vigentes[c.tipo]);

  function revisar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const parsed = tasasSchema.safeParse(valores);
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    setFieldErrors({});
    setOpen(true);
  }

  function confirmar() {
    const datos = new FormData();
    datos.set("posterior", valores.posterior);
    datos.set("previa", valores.previa);
    setError(null);
    startTransition(async () => {
      const r = await guardarTasasAction(datos);
      if (r.ok) {
        setVigentes(r.data);
        setValores(comoTexto(r.data));
        setFieldErrors({});
        setOpen(false);
        return;
      }
      if (r.fieldErrors && Object.keys(r.fieldErrors).length > 0) {
        setFieldErrors(r.fieldErrors);
        setOpen(false);
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Montos vigentes</CardTitle>
          <CardDescription>Escribe el monto en soles, con punto o coma para los céntimos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={revisar} className="flex flex-col gap-5" noValidate>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {CAMPOS.map(({ campo, etiqueta }) => {
                const mensaje = fieldErrors[campo]?.[0];
                return (
                  <div key={campo} className="flex min-w-0 flex-col gap-1.5">
                    <Label htmlFor={`${id}-${campo}`}>{etiqueta}</Label>
                    <div className="relative">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
                      >
                        S/
                      </span>
                      <Input
                        id={`${id}-${campo}`}
                        name={campo}
                        inputMode="decimal"
                        autoComplete="off"
                        value={valores[campo]}
                        onChange={(e) => setValores((v) => ({ ...v, [campo]: e.target.value }))}
                        required
                        aria-required="true"
                        className="h-11 pl-9"
                        aria-invalid={mensaje ? true : undefined}
                        aria-describedby={mensaje ? `${id}-${campo}-error` : undefined}
                      />
                    </div>
                    {mensaje && (
                      <p id={`${id}-${campo}-error`} className="text-sm text-destructive">
                        {mensaje}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div>
              <Button type="submit" className="h-11 px-6" disabled={modificados.length === 0}>
                Guardar cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={open} onOpenChange={(abierto) => !pending && setOpen(abierto)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar el cambio de tasa?</AlertDialogTitle>
            <AlertDialogDescription>
              Rige para los pagos que se inicien desde ahora. Los pagos en curso y los expedientes ya pagados no
              cambian.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="flex flex-col gap-2 text-sm">
            {modificados.map((c) => (
              <li key={c.campo} className="break-words">
                <span className="font-medium">{c.etiqueta}</span>
                <br />
                {soles(vigentes[c.tipo])} → {soles(solesACentimos(valores[c.campo]) ?? 0)}
              </li>
            ))}
          </ul>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11" disabled={pending}>
              Cancelar
            </AlertDialogCancel>
            <Button className="h-11" onClick={confirmar} disabled={pending}>
              {pending ? "Guardando…" : "Confirmar cambio"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <HistorialCambios entidad="TASA" items={historial} />
    </div>
  );
}
