import { aInputLima } from "@/modules/inspecciones/utils/fecha-diligencia";
import { sumarDiasHabiles } from "@/modules/inspecciones/utils/dias-habiles";

export type TipoItse = "POSTERIOR" | "PREVIA";
export type ReprogramacionValidacion = "ok" | "pasada" | "fuera_de_plazo";

export function plazoSubsanacionDias(tipo: TipoItse): number {
  return tipo === "PREVIA" ? 20 : 3;
}

export function calcularLimiteSubsanacion(tipo: TipoItse, suspendidaEn: Date): Date {
  return sumarDiasHabiles(suspendidaEn, plazoSubsanacionDias(tipo));
}

export function validarReprogramacion(fecha: Date, limite: Date, ahora: Date): ReprogramacionValidacion {
  const dia = aInputLima(fecha);
  if (dia < aInputLima(ahora)) return "pasada";
  if (dia > aInputLima(limite)) return "fuera_de_plazo";
  return "ok";
}
