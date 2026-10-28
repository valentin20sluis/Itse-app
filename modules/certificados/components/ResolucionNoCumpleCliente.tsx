import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";

export function ResolucionNoCumpleCliente({ resolucionAt }: { resolucionAt: Date }) {
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
        <p className="text-sm">
          Tu resolución ya está disponible. Ve a{" "}
          <Link href="/mi-cuenta/certificados" className="font-medium underline underline-offset-2">
            Mis certificados
          </Link>{" "}
          para descargarla.
        </p>
      </CardContent>
    </Card>
  );
}
