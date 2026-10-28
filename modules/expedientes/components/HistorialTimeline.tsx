import { etiquetaEstado } from "@/modules/expedientes/constants/estado-labels";
import type { HistorialItem } from "@/modules/expedientes/types/bandeja.types";
import { formatFechaHora } from "@/modules/expedientes/utils/format-fecha";

export function HistorialTimeline({ historial, noCumple }: { historial: HistorialItem[]; noCumple?: boolean }) {
  if (historial.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>;
  }

  return (
    <ol className="flex flex-col gap-4 border-l border-border pl-4">
      {historial.map((h) => {
        const esNota = h.estadoAnterior === h.estadoNuevo;
        return (
          <li key={h.id} className="relative flex flex-col gap-1 break-words">
            <span
              aria-hidden="true"
              className="absolute -left-[1.3rem] top-1.5 size-2 rounded-full bg-primary"
            />
            <p className="text-sm font-medium text-foreground">
              {esNota
                ? h.estadoNuevo === "EN_SUBSANACION"
                  ? "Seguimiento de la subsanación"
                  : "Nivel de riesgo actualizado"
                : etiquetaEstado(h.estadoNuevo, { noCumple })}
            </p>
            <p className="text-xs text-muted-foreground">
              <time dateTime={h.createdAt.toISOString()}>{formatFechaHora(h.createdAt)}</time>
              {h.actorNombre ? ` · ${h.actorNombre}` : null}
            </p>
            {h.comentario ? <p className="text-sm text-foreground">{h.comentario}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}
