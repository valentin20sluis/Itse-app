import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ESTADO_LABELS } from "@/modules/expedientes/constants/estado-labels";
import type { Reporte } from "@/modules/reportes/types/reporte.types";

const dias = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

type Props = { tiempos: Reporte["tiempos"]; tiempoEntrega: Reporte["tiempoEntrega"] };

export function TiemposEtapaTabla({ tiempos, tiempoEntrega }: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Tiempo promedio en días que los expedientes estuvieron en cada etapa, contando solo las etapas ya terminadas. Las
        etapas «Observado» y «En subsanación» incluyen el tiempo de espera del administrado.
      </p>
      {tiempos.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Sin datos para mostrar.</p>
      ) : (
        <div className="min-w-0 overflow-x-auto">
          <Table>
            <TableCaption className="sr-only">Tiempo promedio por etapa</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Etapa</TableHead>
                <TableHead scope="col" className="text-right">Promedio (días)</TableHead>
                <TableHead scope="col" className="text-right">Pasos medidos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiempos.map((t) => (
                <TableRow key={t.estado}>
                  <TableHead scope="row" className="whitespace-normal font-normal text-foreground">
                    {ESTADO_LABELS[t.estado].label}
                  </TableHead>
                  <TableCell className="text-right">{dias(t.promedioDias)}</TableCell>
                  <TableCell className="text-right">{t.cantidad}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-sm">
        <span className="font-medium">Tiempo promedio hasta la entrega: </span>
        {tiempoEntrega === null ? "Sin datos" : `${dias(tiempoEntrega)} días`}
      </p>
    </div>
  );
}
