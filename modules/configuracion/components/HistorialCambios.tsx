import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AuditoriaConfigItem,
  EntidadConfiguracion,
} from "@/modules/configuracion/services/auditoria-configuracion.service";
import { describirCambioConfig } from "@/modules/configuracion/utils/auditoria-texto";
import { formatFechaHora } from "@/modules/expedientes/utils/format-fecha";

export function HistorialCambios({
  entidad,
  items,
}: {
  entidad: EntidadConfiguracion;
  items: AuditoriaConfigItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de cambios</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay cambios.</p>
        ) : (
          <ul className="flex flex-col gap-3 text-sm">
            {items.map((a) => (
              <li key={a.id} className="flex flex-col gap-0.5 border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="break-words font-medium">{describirCambioConfig(entidad, a)}</span>
                <span className="break-words text-muted-foreground">
                  {a.actorNombre} · {formatFechaHora(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
