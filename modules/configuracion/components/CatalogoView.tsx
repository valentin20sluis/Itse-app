import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
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
import { HistorialCambios } from "@/modules/configuracion/components/HistorialCambios";
import { ObservacionFormDialog } from "@/modules/configuracion/components/ObservacionFormDialog";
import { ToggleObservacionDialog } from "@/modules/configuracion/components/ToggleObservacionDialog";
import type { AuditoriaConfigItem } from "@/modules/configuracion/services/auditoria-configuracion.service";
import type { ObservacionItem } from "@/modules/configuracion/types/configuracion.types";

function Estado({ activo }: { activo: boolean }) {
  return <Badge variant={activo ? "default" : "secondary"}>{activo ? "Activa" : "Desactivada"}</Badge>;
}

function Acciones({ observacion }: { observacion: ObservacionItem }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ObservacionFormDialog observacion={observacion} />
      <ToggleObservacionDialog observacion={observacion} />
    </div>
  );
}

export function CatalogoView({
  items,
  historial,
}: {
  items: ObservacionItem[];
  historial: AuditoriaConfigItem[];
}) {
  const sinActivas = !items.some((o) => o.activo);

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Catálogo de observaciones"
          description="Observaciones no relevantes que se ofrecen al registrar el resultado de una inspección."
        />
        <div className="mb-6 sm:shrink-0">
          <ObservacionFormDialog />
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {sinActivas && items.length > 0 && (
          <p role="status" className="rounded-lg border border-border bg-muted p-3 text-sm">
            Sin observaciones activas, en ITSE posterior toda observación se considerará relevante.
          </p>
        )}

        {items.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title="Aún no hay observaciones"
            description="Agrega las observaciones no relevantes que los inspectores podrán elegir."
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableCaption className="sr-only">Catálogo de observaciones no relevantes</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Descripción</TableHead>
                    <TableHead scope="col">Estado</TableHead>
                    <TableHead scope="col">
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="whitespace-normal break-words">{o.descripcion}</TableCell>
                      <TableCell className="whitespace-normal">
                        <Estado activo={o.activo} />
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <Acciones observacion={o} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 gap-4 md:hidden">
              {items.map((o) => (
                <Card key={o.id}>
                  <CardHeader>
                    <CardTitle className="break-words text-base">{o.descripcion}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <Estado activo={o.activo} />
                    <Acciones observacion={o} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <HistorialCambios entidad="OBSERVACION" items={historial} />
      </div>
    </div>
  );
}
