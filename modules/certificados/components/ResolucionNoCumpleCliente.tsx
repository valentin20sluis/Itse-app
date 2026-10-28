import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";

type Props = { expedienteId: string; resolucionAt: Date };

export function ResolucionNoCumpleCliente({ expedienteId, resolucionAt }: Props) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-medium">Resolución de no cumple</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">
          La inspección determinó que el establecimiento no cumple las condiciones de seguridad exigidas.
          Resolución del {formatFecha(resolucionAt)}. No se emitió certificado.
        </p>
        <a
          href={`/api/expedientes/${expedienteId}/resolucion`}
          download
          className={buttonVariants({ variant: "outline", className: "inline-flex min-h-11 w-fit" })}
        >
          Descargar resolución
        </a>
      </CardContent>
    </Card>
  );
}
