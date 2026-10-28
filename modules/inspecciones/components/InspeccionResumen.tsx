import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ResumenInspeccion } from "@/modules/inspecciones/services/designacion.service";

import { formatFecha } from "@/modules/expedientes/utils/format-fecha";

type Props = ResumenInspeccion & {
  programadaPara?: Date | null;
  lugar?: string;
  // Vista del cliente: aviso de contacto (el teléfono puede faltar).
  avisoContacto?: { telefono?: string | null };
};

export function InspeccionResumen({
  total,
  nombres,
  inspectores,
  programadaPara,
  lugar,
  avisoContacto,
}: Props) {
  if (total === 0 && !programadaPara) return null;
  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-medium">Inspección</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 break-words">
        {total > 0 && <p className="text-sm">Inspectores designados: {total}</p>}
        {programadaPara && (
          <>
            <p className="text-sm">Inspección programada: {formatFecha(programadaPara)}</p>
            {lugar && <p className="text-sm">Lugar: {lugar}</p>}
          </>
        )}
        {nombres && nombres.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm">
            {nombres.map((n) => (
              <li key={n} className="break-words font-medium">
                {n}
              </li>
            ))}
          </ul>
        )}
        {avisoContacto && total > 0 && (
          <p className="text-sm">
            El inspector se comunicará contigo al número registrado del solicitante
            {avisoContacto.telefono ? ` (${avisoContacto.telefono})` : ""}. Mantente atento a tu teléfono.
          </p>
        )}
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
