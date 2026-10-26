import type {
  NivelRiesgo,
  TipoTramite,
} from "@/modules/expedientes/types/expediente.types";

export function declaracionTexto(
  tipoTramite: TipoTramite,
  nivelRiesgo: NivelRiesgo,
): string {
  if (nivelRiesgo === "BAJO" || nivelRiesgo === "MEDIO") {
    return "Declaro bajo juramento que el establecimiento cumple con las condiciones de seguridad exigidas por la normativa vigente.";
  }
  if (tipoTramite === "RENOVACION") {
    return "Declaro bajo juramento que se mantienen las condiciones de seguridad del establecimiento verificadas en la inspección anterior.";
  }
  return "Declaro bajo juramento que los datos consignados y los documentos adjuntos a esta solicitud son verdaderos.";
}
