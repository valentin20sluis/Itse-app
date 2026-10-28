import type { ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  CALIDAD_LABELS,
  RIESGO_LABELS,
  TIPO_TRAMITE_LABELS,
} from "@/modules/expedientes/constants/expediente-labels";
import type { ExpedienteDetalle } from "@/modules/expedientes/types/bandeja.types";
import { DOCUMENTOS } from "@/modules/expedientes/utils/documentos";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base font-medium">{titulo}</h2>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Campos({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([etiqueta, valor]) => (
        <div key={etiqueta} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
          <dd className="break-words text-sm text-foreground">
            {valor || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ExpedienteDatos({ detalle }: { detalle: ExpedienteDetalle }) {
  const {
    expediente: e,
    establecimiento: est,
    solicitante: s,
    documentos,
  } = detalle;

  const solicitud: [string, ReactNode][] = [
    ["Tipo de trámite", TIPO_TRAMITE_LABELS[e.tipoTramite]],
    [
      "Nivel de riesgo declarado",
      e.nivelRiesgo ? RIESGO_LABELS[e.nivelRiesgo] : null,
    ],
    [
      "Fecha de presentación",
      e.presentadoAt ? formatFecha(e.presentadoAt) : null,
    ],
    ["Fecha de pago", e.pagadoAt ? formatFecha(e.pagadoAt) : null],
    ["Calidad del solicitante", CALIDAD_LABELS[s.calidad]],
  ];
  if (s.razonSocial) solicitud.push(["Razón social", s.razonSocial]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Seccion titulo="Solicitud">
          <Campos items={solicitud} />
        </Seccion>
        <Seccion titulo="Establecimiento">
          <Campos
            items={[
              ["Nombre comercial", est.nombreComercial],
              ["Dirección", est.direccion],
              ["Distrito", est.distrito],
              ["Giro", est.giro],
              ["Área", `${est.areaM2} m²`],
              ["Pisos", String(est.numeroPisos)],
            ]}
          />
        </Seccion>
      </div>
      <Seccion titulo="Solicitante">
        <Campos
          items={[
            ["Nombre", s.nombre],
            ["Documento", s.documento],
            ["Teléfono", s.telefono],
            ["Correo", s.email],
          ]}
        />
      </Seccion>
      <Seccion titulo="Documentos">
        {documentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay documentos adjuntos.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {documentos.map((d) => {
              const etiqueta =
                DOCUMENTOS.find((x) => x.tipo === d.tipo)?.etiqueta ??
                "Documento adjunto";
              return (
                <li key={d.id}>
                  <a
                    href={`/api/documentos/${e.id}?tipo=${d.tipo}`}
                    className="inline-flex min-h-11 items-center break-words text-sm text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {etiqueta}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </Seccion>
    </div>
  );
}
