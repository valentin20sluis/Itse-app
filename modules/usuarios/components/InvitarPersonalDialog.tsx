"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
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
import type { ActionResult } from "@/lib/action-result";
import { invitarPersonalAction } from "@/modules/usuarios/actions/usuario.actions";

export function InvitarPersonalDialog() {
  const [open, setOpen] = useState(false);
  const [intento, setIntento] = useState(0);

  return (
    <>
      <Button
        className="h-11"
        onClick={() => {
          setIntento((n) => n + 1);
          setOpen(true);
        }}
      >
        <UserPlus data-icon="inline-start" />
        Invitar personal
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <FormBody key={intento} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function FormBody() {
  const [state, formAction, pending] = useActionState<ActionResult<{ email: string }> | null, FormData>(
    invitarPersonalAction,
    null,
  );
  // Controlado: React 19 vacía los campos no controlados tras cada envío, también si hubo errores.
  const [email, setEmail] = useState("");

  const fieldError = state && !state.ok ? state.fieldErrors?.email?.[0] : undefined;
  const generalError = state && !state.ok && !fieldError ? state.error : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Invitar personal</DialogTitle>
        <DialogDescription>
          La persona recibirá un correo para crear su contraseña y entrará con rol Admin.
        </DialogDescription>
      </DialogHeader>

      {state?.ok ? (
        <div className="flex flex-col gap-4">
          <p role="status" className="text-sm">
            Invitación enviada a {state.data.email}.
          </p>
          <div className="flex justify-end">
            <DialogClose render={<Button type="button" className="h-11 px-6" />}>Cerrar</DialogClose>
          </div>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invitar-email">Correo electrónico</Label>
            <Input
              id="invitar-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              className="h-11"
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? "invitar-email-error" : undefined}
            />
            {fieldError && (
              <p id="invitar-email-error" className="text-sm text-destructive">
                {fieldError}
              </p>
            )}
          </div>
          {generalError && (
            <p role="alert" className="text-sm text-destructive">
              {generalError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <DialogClose render={<Button type="button" variant="outline" className="h-11" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={pending} className="h-11 px-6">
              {pending ? "Enviando…" : "Enviar invitación"}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
