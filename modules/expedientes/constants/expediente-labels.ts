import type { Expediente, NivelRiesgo, TipoTramite } from "@/modules/expedientes/types/expediente.types";

export const TIPO_TRAMITE_LABELS: Record<TipoTramite, string> = {
  NUEVA: "Nueva inspección",
  RENOVACION: "Renovación",
};

export const CALIDAD_LABELS: Record<Expediente["calidadSolicitante"], string> = {
  PROPIETARIO: "Propietario",
  REPRESENTANTE_LEGAL: "Representante legal",
  ADMINISTRADOR: "Administrador",
};

export const RIESGO_LABELS: Record<NivelRiesgo, string> = {
  BAJO: "Bajo",
  MEDIO: "Medio",
  ALTO: "Alto",
  MUY_ALTO: "Muy alto",
};
