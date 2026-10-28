import type { VariantProps } from "class-variance-authority";

import type { badgeVariants } from "@/components/ui/badge";
import type { estadoExpedienteEnum } from "@/db/schema";

export type EstadoExpediente = (typeof estadoExpedienteEnum.enumValues)[number];

export const ESTADO_LABELS: Record<
  EstadoExpediente,
  { label: string; variant: NonNullable<VariantProps<typeof badgeVariants>["variant"]> }
> = {
  BORRADOR: { label: "Borrador", variant: "outline" },
  PRESENTADO: { label: "Presentado", variant: "secondary" },
  EN_REVISION: { label: "En revisión", variant: "secondary" },
  OBSERVADO_REQUISITOS: { label: "Observado", variant: "destructive" },
  EN_TRAMITE_EXTERNO: { label: "En trámite externo", variant: "secondary" },
  INSPECTOR_DESIGNADO: { label: "Inspector designado", variant: "secondary" },
  DILIGENCIA_PROGRAMADA: { label: "Inspección programada", variant: "secondary" },
  EN_SUBSANACION: { label: "En subsanación", variant: "destructive" },
  CUMPLE: { label: "Cumple", variant: "default" },
  NO_CUMPLE: { label: "No cumple", variant: "destructive" },
  CERTIFICADO_PENDIENTE_FIRMA: { label: "Certificado por firmar", variant: "secondary" },
  PENDIENTE_RESOLUCION: { label: "Pendiente de resolución", variant: "secondary" },
  FINALIZADO: { label: "Certificado y Resolución Aprobado", variant: "default" },
  ENTREGADO: { label: "Finalizado", variant: "default" },
  DERIVADO_COMERCIALIZACION: { label: "Derivado a Comercialización", variant: "secondary" },
  ANULADO: { label: "Anulado", variant: "outline" },
  ENVIADO_JEFATURA: { label: "Enviado a Jefatura", variant: "secondary" },
  APROBADO_JEFATURA: { label: "Aprobado por Jefatura", variant: "default" },
};
