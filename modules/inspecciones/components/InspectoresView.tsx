"use client";

import { useState, useTransition } from "react";
import { Check, Plus, UserSearch } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Inspector } from "@/db/schema";
import { setInspectorActivoAction } from "@/modules/inspecciones/actions/inspector.actions";
import { InspectorForm } from "@/modules/inspecciones/components/InspectorForm";
import { ToggleInspectorDialog } from "@/modules/inspecciones/components/ToggleInspectorDialog";

type FormTarget = { inspector?: Inspector } | null;

const nombreCompleto = (i: Inspector) => `${i.apellidos}, ${i.nombres}`;
// Por ahora todos los inspectores están habilitados para cualquier nivel de riesgo.
function Habilitado() {
  return (
    <span className="inline-flex items-center gap-1 text-success">
      <Check className="size-4" aria-hidden="true" />
      Habilitado
    </span>
  );
}

function EstadoBadge({ activo }: { activo: boolean }) {
  return <Badge variant={activo ? "default" : "outline"}>{activo ? "Activo" : "Inactivo"}</Badge>;
}

export function InspectoresView({ inspectores }: { inspectores: Inspector[] }) {
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [toggleTarget, setToggleTarget] = useState<Inspector | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reactivar(i: Inspector) {
    setError(null);
    startTransition(async () => {
      const result = await setInspectorActivoAction(i.id, true);
      if (!result.ok) setError(result.error);
    });
  }

  const newButton = (
    <Button className="h-11" onClick={() => setFormTarget({})}>
      <Plus data-icon="inline-start" />
      Nuevo inspector
    </Button>
  );

  function acciones(i: Inspector) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="h-11"
          onClick={() => setFormTarget({ inspector: i })}
          aria-label={`Editar a ${nombreCompleto(i)}`}
        >
          Editar
        </Button>
        {i.activo ? (
          <Button
            variant="outline"
            className="h-11"
            onClick={() => setToggleTarget(i)}
            aria-label={`Desactivar a ${nombreCompleto(i)}`}
          >
            Desactivar
          </Button>
        ) : (
          <Button
            variant="outline"
            className="h-11"
            disabled={pending}
            onClick={() => reactivar(i)}
            aria-label={`Reactivar a ${nombreCompleto(i)}`}
          >
            Reactivar
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Inspectores"
          description="Personas que realizan las diligencias de inspección técnica de seguridad."
        />
        {inspectores.length > 0 && <div className="mb-6 sm:shrink-0">{newButton}</div>}
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {inspectores.length === 0 ? (
        <EmptyState
          icon={<UserSearch />}
          title="Aún no hay inspectores"
          description="Registra al primer inspector para poder designarlo en los expedientes."
          action={newButton}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableCaption className="sr-only">Inspectores registrados</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Nombre</TableHead>
                  <TableHead scope="col">Documento</TableHead>
                  <TableHead scope="col">Teléfono</TableHead>
                  <TableHead scope="col">Correo</TableHead>
                  <TableHead scope="col">Habilitado</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspectores.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="whitespace-normal break-words font-medium">
                      {nombreCompleto(i)}
                    </TableCell>
                    <TableCell className="whitespace-normal">{i.documento}</TableCell>
                    <TableCell className="whitespace-normal">{i.telefono}</TableCell>
                    <TableCell className="whitespace-normal break-words">{i.email}</TableCell>
                    <TableCell className="whitespace-normal"><Habilitado /></TableCell>
                    <TableCell className="whitespace-normal">
                      <EstadoBadge activo={i.activo} />
                    </TableCell>
                    <TableCell className="whitespace-normal">{acciones(i)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 gap-4 md:hidden">
            {inspectores.map((i) => (
              <Card key={i.id}>
                <CardHeader>
                  <CardTitle className="break-words">{nombreCompleto(i)}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Documento</dt>
                    <dd className="min-w-0 break-words">{i.documento}</dd>
                    <dt className="text-muted-foreground">Teléfono</dt>
                    <dd className="min-w-0 break-words">{i.telefono}</dd>
                    <dt className="text-muted-foreground">Correo</dt>
                    <dd className="min-w-0 break-words">{i.email}</dd>
                    <dt className="text-muted-foreground">Habilitado</dt>
                    <dd>
                      <Habilitado />
                    </dd>
                    <dt className="text-muted-foreground">Estado</dt>
                    <dd>
                      <EstadoBadge activo={i.activo} />
                    </dd>
                  </dl>
                  {acciones(i)}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <InspectorForm
        key={formTarget?.inspector?.id ?? "nuevo"}
        open={formTarget !== null}
        onOpenChange={(open) => {
          if (!open) setFormTarget(null);
        }}
        inspector={formTarget?.inspector}
      />
      <ToggleInspectorDialog inspector={toggleTarget} onClose={() => setToggleTarget(null)} />
    </div>
  );
}
