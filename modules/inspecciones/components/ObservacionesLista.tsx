import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ResumenSubsanacion } from "@/modules/inspecciones/services/diligencia.service";

export function ObservacionesLista({
  observaciones,
}: {
  observaciones: ResumenSubsanacion["observaciones"];
}) {
  if (observaciones.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-medium">Observaciones de la inspección</h2>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {observaciones.map((o) => (
            <li key={o.id} className="break-words">
              {o.descripcion}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
