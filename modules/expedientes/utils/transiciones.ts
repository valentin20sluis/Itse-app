import { ESTADO_LABELS, type EstadoExpediente } from "@/modules/expedientes/constants/estado-labels";
import type { Role } from "@/modules/usuarios/types/user.types";

export const ESTADOS_FINALES: readonly EstadoExpediente[] = [
  "ANULADO",
  "ENTREGADO",
  "DERIVADO_COMERCIALIZACION",
];

const ESTADOS = Object.keys(ESTADO_LABELS) as EstadoExpediente[];

const FLUJO: Partial<Record<EstadoExpediente, EstadoExpediente[]>> = {
  PRESENTADO: ["EN_REVISION"],
  EN_REVISION: ["OBSERVADO_REQUISITOS", "ENVIADO_JEFATURA"],
  ENVIADO_JEFATURA: ["APROBADO_JEFATURA", "EN_REVISION"],
  APROBADO_JEFATURA: ["INSPECTOR_DESIGNADO"],
  INSPECTOR_DESIGNADO: ["DILIGENCIA_PROGRAMADA"],
  DILIGENCIA_PROGRAMADA: ["CUMPLE", "NO_CUMPLE"],
};

// Destinos que exigen datos propios (inspectores, fecha, informe): no se alcanzan con el cambio de estado genérico.
export const DESTINOS_CON_FLUJO_PROPIO: readonly EstadoExpediente[] = [
  "INSPECTOR_DESIGNADO",
  "DILIGENCIA_PROGRAMADA",
  "CUMPLE",
  "NO_CUMPLE",
];

const SOLO_SUPERADMIN = (desde: EstadoExpediente, hasta: EstadoExpediente) =>
  hasta === "ANULADO" ||
  hasta === "APROBADO_JEFATURA" ||
  (desde === "ENVIADO_JEFATURA" && hasta === "EN_REVISION");

export const TRANSICIONES: Record<EstadoExpediente, EstadoExpediente[]> = Object.fromEntries(
  ESTADOS.map((estado) => {
    const anulable = estado !== "BORRADOR" && !ESTADOS_FINALES.includes(estado);
    return [estado, [...(FLUJO[estado] ?? []), ...(anulable ? ["ANULADO"] : [])]];
  }),
) as Record<EstadoExpediente, EstadoExpediente[]>;

export function transicionesPermitidas(estado: EstadoExpediente, rol: Role): EstadoExpediente[] {
  if (rol === "cliente") return [];
  return TRANSICIONES[estado].filter(
    (hasta) => rol === "superadmin" || !SOLO_SUPERADMIN(estado, hasta),
  );
}

export function transicionesGenericas(estado: EstadoExpediente, rol: Role): EstadoExpediente[] {
  return transicionesPermitidas(estado, rol).filter((h) => !DESTINOS_CON_FLUJO_PROPIO.includes(h));
}

export function puedeTransicionar(
  desde: EstadoExpediente,
  hasta: EstadoExpediente,
  rol: Role,
): boolean {
  return transicionesPermitidas(desde, rol).includes(hasta);
}

export function requiereMotivo(hasta: EstadoExpediente, desde?: EstadoExpediente): boolean {
  return (
    hasta === "OBSERVADO_REQUISITOS" ||
    hasta === "ANULADO" ||
    (hasta === "EN_REVISION" && desde === "ENVIADO_JEFATURA")
  );
}
