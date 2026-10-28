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
import { setUsuarioActivoAction } from "@/modules/usuarios/actions/usuario.actions";
import { CambiarRolDialog } from "@/modules/usuarios/components/CambiarRolDialog";
import type { Role } from "@/modules/usuarios/types/user.types";

type Props = {
  usuario: { id: string; nombre: string; rol: Role; activo: boolean; esActual: boolean };
};

export function UsuarioAcciones({ usuario }: Props) {
  const [dialogo, setDialogo] = useState<"rol" | "desactivar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cerrar() {
    setError(null);
    setDialogo(null);
  }

  function cambiarEstado(activo: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setUsuarioActivoAction(usuario.id, activo);
      if (result.ok) cerrar();
      else setError(result.error);
    });
  }

  if (usuario.esActual) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button className="h-11" disabled aria-label={`Cambiar rol de ${usuario.nombre}`}>
            Cambiar rol
          </Button>
          <Button variant="outline" className="h-11" disabled aria-label={`Desactivar a ${usuario.nombre}`}>
            Desactivar
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">No puedes modificar tu propia cuenta</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          className="h-11"
          onClick={() => setDialogo("rol")}
          aria-label={`Cambiar rol de ${usuario.nombre}`}
        >
          Cambiar rol
        </Button>
        {usuario.activo ? (
          <Button
            variant="outline"
            className="h-11"
            onClick={() => setDialogo("desactivar")}
            aria-label={`Desactivar a ${usuario.nombre}`}
          >
            Desactivar
          </Button>
        ) : (
          <Button
            variant="outline"
            className="h-11"
            disabled={pending}
            onClick={() => cambiarEstado(true)}
            aria-label={`Reactivar a ${usuario.nombre}`}
          >
            {pending ? "Reactivando…" : "Reactivar"}
          </Button>
        )}
      </div>
      {error && dialogo === null && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <CambiarRolDialog
        open={dialogo === "rol"}
        onClose={cerrar}
        usuario={{ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol }}
      />

      <AlertDialog
        open={dialogo === "desactivar"}
        onOpenChange={(open) => {
          if (!open) cerrar();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar a {usuario.nombre}?</AlertDialogTitle>
            <AlertDialogDescription>
              La persona ya no podrá usar el sistema hasta que la reactives.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11" disabled={pending}>
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              className="h-11"
              onClick={() => cambiarEstado(false)}
              disabled={pending}
            >
              {pending ? "Desactivando…" : "Desactivar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
