import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
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
import { EliminarFeriadoDialog } from "@/modules/configuracion/components/EliminarFeriadoDialog";
import { FeriadoFormDialog } from "@/modules/configuracion/components/FeriadoFormDialog";
import { HistorialCambios } from "@/modules/configuracion/components/HistorialCambios";
import type { FeriadoItem } from "@/modules/configuracion/services/feriado-gestion.service";
import type { AuditoriaConfigItem } from "@/modules/configuracion/services/auditoria-configuracion.service";
import { fechaCorta } from "@/modules/configuracion/utils/auditoria-texto";
import { parseFechaLima } from "@/modules/inspecciones/utils/fecha-diligencia";

const diaSemana = new Intl.DateTimeFormat("es-PE", { weekday: "long", timeZone: "America/Lima" });

function nombreDia(fecha: string): string {
  const d = parseFechaLima(fecha);
  return d ? diaSemana.format(d) : "";
}

function porAnio(feriados: FeriadoItem[]): [string, FeriadoItem[]][] {
  const grupos = new Map<string, FeriadoItem[]>();
  for (const f of feriados) {
    const anio = f.fecha.slice(0, 4);
    grupos.set(anio, [...(grupos.get(anio) ?? []), f]);
  }
  return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function Acciones({ feriado }: { feriado: FeriadoItem }) {
  return (
    <div className="flex flex-wrap gap-2">
      <FeriadoFormDialog feriado={feriado} />
      <EliminarFeriadoDialog feriado={feriado} />
    </div>
  );
}

export function FeriadosView({
  feriados,
  historial,
}: {
  feriados: FeriadoItem[];
  historial: AuditoriaConfigItem[];
}) {
  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Feriados"
          description="Días que no cuentan en los plazos de subsanación, además de sábados y domingos."
        />
        <div className="mb-6 sm:shrink-0">
          <FeriadoFormDialog />
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {feriados.length === 0 ? (
          <EmptyState
            icon={<CalendarDays />}
            title="Aún no hay feriados"
            description="Agrega los feriados para que los plazos no cuenten esos días."
          />
        ) : (
          porAnio(feriados).map(([anio, lista]) => (
            <section key={anio} aria-labelledby={`feriados-${anio}`} className="flex flex-col gap-3">
              <h2 id={`feriados-${anio}`} className="text-lg font-semibold">
                {anio}
              </h2>

              <div className="hidden md:block">
                <Table>
                  <TableCaption className="sr-only">Feriados del {anio}</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Fecha</TableHead>
                      <TableHead scope="col">Día</TableHead>
                      <TableHead scope="col">Nombre</TableHead>
                      <TableHead scope="col">
                        <span className="sr-only">Acciones</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lista.map((f) => (
                      <TableRow key={f.fecha}>
                        <TableCell className="whitespace-normal font-medium">{fechaCorta(f.fecha)}</TableCell>
                        <TableCell className="whitespace-normal capitalize">{nombreDia(f.fecha)}</TableCell>
                        <TableCell className="whitespace-normal break-words">{f.nombre}</TableCell>
                        <TableCell className="whitespace-normal">
                          <Acciones feriado={f} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-1 gap-4 md:hidden">
                {lista.map((f) => (
                  <Card key={f.fecha}>
                    <CardHeader>
                      <CardTitle className="break-words">{f.nombre}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <p className="text-sm text-muted-foreground">
                        {fechaCorta(f.fecha)} · <span className="capitalize">{nombreDia(f.fecha)}</span>
                      </p>
                      <Acciones feriado={f} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))
        )}

        <HistorialCambios entidad="FERIADO" items={historial} />
      </div>
    </div>
  );
}
