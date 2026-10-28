import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ResumenInspeccion } from "@/modules/inspecciones/services/designacion.service";

export function InspeccionResumen({ total, inspectores }: ResumenInspeccion) {
  if (total === 0) return null;
  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-medium">Inspección</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 break-words">
        <p className="text-sm">Inspectores designados: {total}</p>
        {inspectores && (
          <ul className="flex flex-col gap-1 text-sm">
            {inspectores.map((i) => (
              <li key={i.documento} className="break-words">
                <span className="font-medium">{i.nombre}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · Doc. {i.documento} · Tel. {i.telefono}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
