import { Download } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ESTADO_LABELS } from "@/modules/expedientes/constants/estado-labels";
import { RIESGO_LABELS } from "@/modules/expedientes/constants/expediente-labels";
import { ESTADOS_ORDEN } from "@/modules/reportes/constants/estados-orden";
import type { FiltrosReporte } from "@/modules/reportes/schemas/filtros-reporte.schema";

const BASE = "/panel/reportes";
const CSV = "/api/reportes/expedientes";
const SELECT =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";
const ENLACE = "min-h-11";
const ESTADOS_OBSOLETOS: readonly string[] = ["EN_TRAMITE_EXTERNO", "PENDIENTE_RESOLUCION", "DERIVADO_COMERCIALIZACION"];

function consulta(filtros: FiltrosReporte): string {
  const params = new URLSearchParams({ desde: filtros.desde, hasta: filtros.hasta });
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.riesgo) params.set("riesgo", filtros.riesgo);
  if (filtros.distrito) params.set("distrito", filtros.distrito);
  return params.toString();
}

type Props = { filtros: FiltrosReporte; distritos: string[] };

export function FiltrosReporteForm({ filtros, distritos }: Props) {
  // Si el distrito de la URL no figura en la lista (p. ej. tope de 50), se agrega para que no se pierda al aplicar.
  const opcionesDistrito = filtros.distrito && !distritos.includes(filtros.distrito) ? [filtros.distrito, ...distritos] : distritos;

  return (
    <form method="get" action={BASE} className="mb-6 flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="desde">Desde</Label>
          <Input id="desde" name="desde" type="date" defaultValue={filtros.desde} className="h-11" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="hasta">Hasta</Label>
          <Input id="hasta" name="hasta" type="date" defaultValue={filtros.hasta} className="h-11" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="estado">Estado</Label>
          <select id="estado" name="estado" defaultValue={filtros.estado ?? ""} className={SELECT}>
            <option value="">Todos</option>
            {ESTADOS_ORDEN.filter((e) => !ESTADOS_OBSOLETOS.includes(e)).map((e) => (
              <option key={e} value={e}>
                {ESTADO_LABELS[e].label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="riesgo">Nivel de riesgo</Label>
          <select id="riesgo" name="riesgo" defaultValue={filtros.riesgo ?? ""} className={SELECT}>
            <option value="">Todos</option>
            {Object.entries(RIESGO_LABELS).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="distrito">Distrito</Label>
          <select id="distrito" name="distrito" defaultValue={filtros.distrito ?? ""} className={SELECT}>
            <option value="">Todos</option>
            {opcionesDistrito.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="submit" className={buttonVariants({ className: ENLACE })}>
          Aplicar filtros
        </button>
        <Link href={BASE} className={buttonVariants({ variant: "outline", className: ENLACE })}>
          Quitar filtros
        </Link>
        <a href={`${CSV}?${consulta(filtros)}`} className={buttonVariants({ className: ENLACE })}>
          <Download data-icon="inline-start" aria-hidden="true" />
          Descargar CSV
        </a>
      </div>
    </form>
  );
}
