"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { prepararCertificadoAction } from "@/modules/certificados/actions/certificado.actions";

export function GenerarCertificadoButton({ expedienteId }: { expedienteId: string }) {
  const [state, action, pending] = useActionState(prepararCertificadoAction.bind(null, expedienteId), null);
  return (
    <form action={action} className="space-y-2">
      <Button type="submit" className="h-11" disabled={pending}>
        {pending ? "Generando…" : "Generar certificado y enviar a Jefatura"}
      </Button>
      <p role="alert" aria-live="polite" className="text-sm text-destructive">
        {state && !state.ok ? state.error : null}
      </p>
    </form>
  );
}
