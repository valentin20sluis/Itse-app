"use client";

import { useState, useTransition } from "react";
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
import { ROLE_LABELS } from "@/modules/navigation/constants/role-labels";
import { cambiarRolAction } from "@/modules/usuarios/actions/usuario.actions";
import type { Role } from "@/modules/usuarios/types/user.types";

const EFECTOS: Record<Role, string> = {
  cliente: "Presenta solicitudes y sigue sus propios expedientes.",
  admin: "Gestiona expedientes e inspectores.",
  superadmin: "Tiene todos los permisos, incluida la gestión de usuarios.",
};
const ROLES = Object.keys(EFECTOS) as Role[];

type Props = {
  open: boolean;
  onClose: () => void;
  usuario: { id: string; nombre: string; rol: Role };
};

export function CambiarRolDialog({ open, onClose, usuario }: Props) {
  const [seleccion, setElegido] = useState<Role | null>(null);
  const elegido = seleccion ?? usuario.rol;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setError(null);
    setElegido(null);
    onClose();
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await cambiarRolAction(usuario.id, elegido);
      if (result.ok) close();
      else setError(result.error);
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cambiar el rol de {usuario.nombre}?</AlertDialogTitle>
          <AlertDialogDescription>
            El cambio se aplica la próxima vez que la persona use el sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <fieldset className="flex flex-col gap-2" disabled={pending}>
          <legend className="mb-1 text-sm font-medium">Nuevo rol</legend>
          {ROLES.map((r) => {
            const actual = r === usuario.rol;
            return (
              <label
                key={r}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm has-[:checked]:border-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
              >
                <input
                  type="radio"
                  name="rol"
                  value={r}
                  checked={elegido === r}
                  disabled={actual}
                  onChange={() => setElegido(r)}
                  className="mt-1 size-4 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block font-medium">
                    {ROLE_LABELS[r]}
                    {actual && " (rol actual)"}
                  </span>
                  <span className="block text-muted-foreground">{EFECTOS[r]}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11" disabled={pending}>
            Cancelar
          </AlertDialogCancel>
          <Button className="h-11" onClick={confirm} disabled={pending || elegido === usuario.rol}>
            {pending ? "Cambiando…" : "Cambiar rol"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
