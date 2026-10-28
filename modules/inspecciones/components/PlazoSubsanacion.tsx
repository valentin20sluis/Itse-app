import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";
import { estadoPlazo } from "@/modules/inspecciones/utils/dias-habiles";

export function PlazoSubsanacion({ limite, ahora = new Date() }: { limite: Date; ahora?: Date }) {
  const { vencido, diasRestantes } = estadoPlazo(limite, ahora);
  const restante =
    diasRestantes === 0
      ? "Vence hoy"
      : `Quedan ${diasRestantes} ${diasRestantes === 1 ? "día hábil" : "días hábiles"}`;

  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-medium">Plazo para subsanar</h2>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <p className="font-medium">Fecha límite: {formatFecha(limite)}</p>
        {vencido ? <Badge variant="destructive">Plazo vencido</Badge> : <p>{restante}</p>}
      </CardContent>
    </Card>
  );
}
