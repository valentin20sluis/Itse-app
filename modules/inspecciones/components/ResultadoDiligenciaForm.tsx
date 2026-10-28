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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { registrarResultadoAction } from "@/modules/inspecciones/actions/diligencia.actions";
import { OBSERVACIONES_NO_RELEVANTES } from "@/modules/inspecciones/constants/observaciones-no-relevantes";
import { plazoSubsanacionDias, type TipoItse } from "@/modules/inspecciones/utils/plazo-subsanacion";

type Resultado = "CUMPLE" | "EN_SUBSANACION" | "NO_CUMPLE";

type Props = {
  expedienteId: string;
  // Nulo cuando el riesgo no está definido: entonces no se puede suspender.
  tipoItse: TipoItse | null;
  // Hoy y el límite de 20 días hábiles en Lima (YYYY-MM-DD), calculados en el servidor.
  min: string;
  max: string;
};

const OPCIONES: { valor: Resultado; label: string }[] = [
  { valor: "CUMPLE", label: "Cumple" },
  { valor: "EN_SUBSANACION", label: "Observaciones subsanables" },
  { valor: "NO_CUMPLE", label: "No cumple" },
];

const MENSAJE_RELEVANTE =
  'Hay observaciones relevantes: en una inspección posterior solo se puede registrar "No cumple".';

export function ResultadoDiligenciaForm({ expedienteId, tipoItse, min, max }: Props) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [codigos, setCodigos] = useState<string[]>([]);
  const [libres, setLibres] = useState("");
  const [state, action, pending] = useActionState<ActionResult<null> | null, FormData>(
    registrarResultadoAction.bind(null, expedienteId),
    null,
  );
  const err = (campo: string) => (state && !state.ok ? state.fieldErrors?.[campo]?.[0] : undefined);

  const suspende = resultado === "EN_SUBSANACION";
  const conObservaciones = suspende || resultado === "NO_CUMPLE";
  const dias = tipoItse ? plazoSubsanacionDias(tipoItse) : 0;
  const relevante = suspende && tipoItse === "POSTERIOR" && libres.trim().length > 0;
  const opciones = OPCIONES.filter((o) => o.valor !== "EN_SUBSANACION" || tipoItse !== null);

  const alternar = (codigo: string, marcado: boolean) =>
    setCodigos((prev) => (marcado ? [...prev, codigo] : prev.filter((c) => c !== codigo)));

  return (
    <form ref={formRef} id={uid} action={action} className="space-y-3">
      <h3 className="font-medium">Registrar resultado</h3>
      <fieldset
        className="space-y-2"
        aria-describedby={err("resultado") ? `${uid}-res-err` : undefined}
      >
        <legend className="mb-2 text-sm font-medium">Resultado</legend>
        <div className="flex flex-col gap-2 sm:flex-row">
          {opciones.map((o) => (
            <label
              key={o.valor}
              htmlFor={`${uid}-${o.valor}`}
              className="flex min-h-11 min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-input px-3 py-2 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 sm:flex-1"
            >
              <input
                id={`${uid}-${o.valor}`}
                type="radio"
                name="resultado"
                value={o.valor}
                required
                checked={resultado === o.valor}
                onChange={() => setResultado(o.valor)}
                className="size-5 shrink-0 accent-primary"
              />
              <span className="text-sm">{o.label}</span>
            </label>
          ))}
        </div>
        {err("resultado") && (
          <p id={`${uid}-res-err`} className="text-sm text-destructive">
            {err("resultado")}
          </p>
        )}
      </fieldset>

      {conObservaciones && (
        <fieldset
          className="space-y-2"
          aria-describedby={err("codigos") ? `${uid}-obs-err` : undefined}
        >
          <legend className="mb-2 text-sm font-medium">
            Observaciones{suspende ? "" : " (opcional)"}
          </legend>
          <div className="flex flex-col gap-2">
            {OBSERVACIONES_NO_RELEVANTES.map((o) => (
              <label
                key={o.codigo}
                className="flex min-h-11 min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-input px-3 py-2 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
              >
                <input
                  type="checkbox"
                  name="codigo"
                  value={o.codigo}
                  checked={codigos.includes(o.codigo)}
                  onChange={(e) => alternar(o.codigo, e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-primary"
                />
                <span className="min-w-0 break-words text-sm">{o.descripcion}</span>
              </label>
            ))}
          </div>
          {err("codigos") && (
            <p id={`${uid}-obs-err`} className="text-sm text-destructive">
              {err("codigos")}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-libres`}>Otras observaciones (una por línea)</Label>
            <Textarea
              id={`${uid}-libres`}
              name="libres"
              value={libres}
              onChange={(e) => setLibres(e.target.value)}
              aria-invalid={err("libres") ? true : undefined}
              aria-describedby={err("libres") ? `${uid}-libres-err` : undefined}
              className="min-h-24"
            />
            {err("libres") && (
              <p id={`${uid}-libres-err`} className="text-sm text-destructive">
                {err("libres")}
              </p>
            )}
          </div>
          {relevante && (
            <p role="status" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
              {MENSAJE_RELEVANTE}
            </p>
          )}
        </fieldset>
      )}

      {suspende && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Plazo máximo: {dias} días hábiles</p>
          {tipoItse === "PREVIA" && (
            <>
              <Label htmlFor={`${uid}-fecha`}>Nueva fecha de inspección</Label>
              <Input
                id={`${uid}-fecha`}
                name="reprogramadaPara"
                type="date"
                required
                aria-required
                min={min}
                max={max}
                aria-invalid={err("reprogramadaPara") ? true : undefined}
                aria-describedby={err("reprogramadaPara") ? `${uid}-fecha-err` : undefined}
                className="h-11 sm:max-w-xs"
              />
              {err("reprogramadaPara") && (
                <p id={`${uid}-fecha-err`} className="text-sm text-destructive">
                  {err("reprogramadaPara")}
                </p>
              )}
            </>
          )}
        </div>
      )}

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
        {pending ? "Guardando…" : "Registrar resultado"}
      </Button>
      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspende ? "¿Suspender la inspección?" : "¿Registrar el resultado?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspende
                ? `La inspección quedará suspendida y el solicitante tendrá hasta ${dias} días hábiles para subsanar. Verá las observaciones, el informe y la fecha límite. Esta acción no se puede deshacer.`
                : "Esta acción no se puede deshacer. El solicitante verá el resultado y el informe."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
            <Button type="submit" form={uid} className="h-11" onClick={() => setConfirmar(false)}>
              {suspende ? "Sí, suspender" : "Sí, registrar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
