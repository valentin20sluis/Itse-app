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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import {
  actualizarRiesgoAction,
  cambiarEstadoAction,
} from "@/modules/expedientes/actions/transicion.actions";
import { RIESGO_LABELS } from "@/modules/expedientes/constants/expediente-labels";
import type { EstadoExpediente } from "@/modules/expedientes/constants/estado-labels";
import type { NivelRiesgo } from "@/modules/expedientes/types/expediente.types";
import {
  requiereMotivo,
  transicionesPermitidas,
} from "@/modules/expedientes/utils/transiciones";
import type { Role } from "@/modules/usuarios/types/user.types";

type Props = {
  expedienteId: string;
  estado: EstadoExpediente;
  rol: Role;
  nivelRiesgo: NivelRiesgo | null;
};

const ACCION_LABELS: Partial<Record<EstadoExpediente, string>> = {
  EN_REVISION: "Iniciar revisión",
  OBSERVADO_REQUISITOS: "Observar requisitos",
  ENVIADO_JEFATURA: "Enviar a Jefatura",
  APROBADO_JEFATURA: "Aprobar",
  ANULADO: "Anular expediente",
};

const SIN_ACCIONES: Partial<Record<EstadoExpediente, string>> = {
  ENVIADO_JEFATURA: "Esperando aprobación de Jefatura.",
  APROBADO_JEFATURA: "Esperando designación de inspector.",
};

function accionLabel(hasta: EstadoExpediente, desde: EstadoExpediente) {
  if (hasta === "EN_REVISION" && desde === "ENVIADO_JEFATURA") return "Devolver";
  return ACCION_LABELS[hasta] ?? hasta;
}

const CONTROL =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm";

function Mensaje({ state }: { state: ActionResult<null> | null }) {
  return (
    <p role="alert" aria-live="polite" className="text-sm text-destructive">
      {state && !state.ok ? state.error : null}
    </p>
  );
}

function ErrorCampo({
  id,
  state,
  campo,
}: {
  id: string;
  state: ActionResult<null> | null;
  campo: string;
}) {
  const msg = state && !state.ok ? state.fieldErrors?.[campo]?.[0] : undefined;
  return msg ? (
    <p id={id} className="text-sm text-destructive">
      {msg}
    </p>
  ) : null;
}

// Transiciones sin motivo obligatorio: un solo botón que ejecuta la acción.
function AccionDirecta({
  expedienteId,
  estado,
  hasta,
}: {
  expedienteId: string;
  estado: EstadoExpediente;
  hasta: EstadoExpediente;
}) {
  const [state, action, pending] = useActionState(
    cambiarEstadoAction.bind(null, expedienteId),
    null,
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="hasta" value={hasta} />
      <Button type="submit" className="h-11" disabled={pending}>
        {pending ? "Guardando…" : accionLabel(hasta, estado)}
      </Button>
      <Mensaje state={state} />
    </form>
  );
}

function FormTransicion({
  expedienteId,
  estado,
  hasta,
}: {
  expedienteId: string;
  estado: EstadoExpediente;
  hasta: EstadoExpediente;
}) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [state, action, pending] = useActionState(
    cambiarEstadoAction.bind(null, expedienteId),
    null,
  );
  const motivo = true;
  const anula = hasta === "ANULADO";
  const errId = `${uid}-err`;
  const hayError = !!(state && !state.ok && state.fieldErrors?.comentario);
  const label = anula
    ? "Confirmar anulación"
    : hasta === "EN_REVISION" && estado === "ENVIADO_JEFATURA"
      ? "Confirmar devolución"
      : "Confirmar";

  return (
    <form ref={formRef} id={uid} action={action} className="space-y-3">
      <input type="hidden" name="hasta" value={hasta} />
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-comentario`}>Motivo</Label>
        <Textarea
          id={`${uid}-comentario`}
          name="comentario"
          required={motivo}
          aria-required={motivo}
          minLength={motivo ? 10 : undefined}
          maxLength={500}
          aria-invalid={hayError || undefined}
          aria-describedby={hayError ? errId : undefined}
          className="min-h-24"
        />
        <ErrorCampo id={errId} state={state} campo="comentario" />
        <p className="text-sm text-muted-foreground">
          El solicitante verá este motivo.
        </p>
      </div>
      <Mensaje state={state} />
      {anula ? (
        <>
          <Button
            type="button"
            variant="destructive"
            className="h-11"
            disabled={pending}
            onClick={() =>
              formRef.current?.reportValidity() && setConfirmar(true)
            }
          >
            {label}
          </Button>
          <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Anular este expediente?</AlertDialogTitle>
                <AlertDialogDescription>
                  El trámite quedará cerrado y esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
                <Button
                  type="submit"
                  form={uid}
                  variant="destructive"
                  className="h-11"
                  onClick={() => setConfirmar(false)}
                >
                  Sí, anular
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <Button type="submit" className="h-11" disabled={pending}>
          {pending ? "Guardando…" : label}
        </Button>
      )}
    </form>
  );
}

function FormRiesgo({
  expedienteId,
  nivelRiesgo,
}: {
  expedienteId: string;
  nivelRiesgo: NivelRiesgo | null;
}) {
  const uid = useId();
  const [state, action, pending] = useActionState(
    actualizarRiesgoAction.bind(null, expedienteId),
    null,
  );
  const err = (campo: string) =>
    state && !state.ok ? state.fieldErrors?.[campo]?.[0] : undefined;

  return (
    <form action={action} className="space-y-3">
      <h3 className="font-medium">Cambiar nivel de riesgo</h3>
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-nivel`}>Nivel de riesgo</Label>
        <select
          id={`${uid}-nivel`}
          name="nivelRiesgo"
          defaultValue={nivelRiesgo ?? ""}
          required
          aria-required
          aria-invalid={err("nivelRiesgo") ? true : undefined}
          aria-describedby={err("nivelRiesgo") ? `${uid}-nivel-err` : undefined}
          className={`${CONTROL} h-11`}
        >
          {!nivelRiesgo && <option value="">Elige un nivel</option>}
          {(Object.keys(RIESGO_LABELS) as NivelRiesgo[]).map((n) => (
            <option key={n} value={n}>
              {RIESGO_LABELS[n]}
            </option>
          ))}
        </select>
        <ErrorCampo id={`${uid}-nivel-err`} state={state} campo="nivelRiesgo" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-nota`}>Nota del cambio</Label>
        <Textarea
          id={`${uid}-nota`}
          name="nota"
          required
          aria-required
          minLength={10}
          maxLength={500}
          aria-invalid={err("nota") ? true : undefined}
          aria-describedby={err("nota") ? `${uid}-nota-err` : undefined}
          className="min-h-24"
        />
        <ErrorCampo id={`${uid}-nota-err`} state={state} campo="nota" />
        <p className="text-sm text-muted-foreground">
          El solicitante verá este motivo.
        </p>
      </div>
      <Mensaje state={state} />
      <Button
        type="submit"
        variant="outline"
        className="h-11"
        disabled={pending}
      >
        {pending ? "Guardando…" : "Guardar nivel de riesgo"}
      </Button>
    </form>
  );
}

export function AccionesExpediente({
  expedienteId,
  estado,
  rol,
  nivelRiesgo,
}: Props) {
  const permitidas = transicionesPermitidas(estado, rol);
  const [elegida, setElegida] = useState<EstadoExpediente | null>(null);
  const directas = permitidas.filter((h) => !requiereMotivo(h, estado));
  const conMotivo = permitidas.filter((h) => requiereMotivo(h, estado));
  const puedeRiesgo = estado === "EN_REVISION" && rol !== "cliente";

  return (
    <section aria-labelledby="acciones-titulo" className="space-y-4">
      <h2 id="acciones-titulo" className="text-lg font-semibold">
        Acciones
      </h2>
      {permitidas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {SIN_ACCIONES[estado] ?? "No hay acciones disponibles en este estado."}
        </p>
      ) : (
        <div className="space-y-4">
          {directas.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {directas.map((hasta) => (
                <AccionDirecta
                  key={hasta}
                  expedienteId={expedienteId}
                  estado={estado}
                  hasta={hasta}
                />
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {conMotivo.map((hasta) => (
              <Button
                key={hasta}
                type="button"
                variant={hasta === elegida ? "default" : "outline"}
                className="h-11"
                aria-pressed={hasta === elegida}
                onClick={() => setElegida(hasta)}
              >
                {accionLabel(hasta, estado)}
              </Button>
            ))}
          </div>
          {elegida && conMotivo.includes(elegida) && (
            <FormTransicion
              key={elegida}
              expedienteId={expedienteId}
              estado={estado}
              hasta={elegida}
            />
          )}
        </div>
      )}
      {puedeRiesgo && (
        <FormRiesgo expedienteId={expedienteId} nivelRiesgo={nivelRiesgo} />
      )}
    </section>
  );
}
