import type { NivelRiesgo } from "@/modules/expedientes/types/expediente.types";

const NIVELES: NivelRiesgo[] = ["BAJO", "MEDIO", "ALTO", "MUY_ALTO"];

export const MAX_PISOS_MEDIO = 3;
export const MAX_AREA_MEDIO_M2 = 750;

export function tipoItsePorRiesgo(nivel: NivelRiesgo): "POSTERIOR" | "PREVIA" {
  return nivel === "BAJO" || nivel === "MEDIO" ? "POSTERIOR" : "PREVIA";
}

export type DatosRiesgo = {
  areaM2: number;
  numeroPisos: number;
  tieneSotano: boolean;
  almacenaInflamables: boolean;
};

export function sugerirNivelRiesgo(datos: DatosRiesgo): NivelRiesgo {
  const base =
    datos.numeroPisos > MAX_PISOS_MEDIO || datos.areaM2 > MAX_AREA_MEDIO_M2
      ? NIVELES.indexOf("ALTO")
      : NIVELES.indexOf("MEDIO");
  const factores =
    Number(datos.tieneSotano) + Number(datos.almacenaInflamables);
  return NIVELES[Math.min(base + factores, NIVELES.length - 1)];
}
