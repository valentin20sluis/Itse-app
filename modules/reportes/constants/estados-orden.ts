import type { estadoExpedienteEnum } from "@/db/schema";

export type EstadoExpediente = (typeof estadoExpedienteEnum.enumValues)[number];

// Flujo principal (reglas-negocio 6.1) y, al final, los estados en desuso y el anulado.
export const ESTADOS_ORDEN: readonly Exclude<EstadoExpediente, "BORRADOR">[] = [
  "PRESENTADO",
  "EN_REVISION",
  "OBSERVADO_REQUISITOS",
  "ENVIADO_JEFATURA",
  "APROBADO_JEFATURA",
  "INSPECTOR_DESIGNADO",
  "DILIGENCIA_PROGRAMADA",
  "EN_SUBSANACION",
  "CUMPLE",
  "NO_CUMPLE",
  "CERTIFICADO_PENDIENTE_FIRMA",
  "FINALIZADO",
  "ENTREGADO",
  "ANULADO",
  "EN_TRAMITE_EXTERNO",
  "PENDIENTE_RESOLUCION",
  "DERIVADO_COMERCIALIZACION",
];
