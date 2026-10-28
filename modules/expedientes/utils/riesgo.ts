import type { NivelRiesgo } from "@/modules/expedientes/types/expediente.types";

const NIVELES: NivelRiesgo[] = ["BAJO", "MEDIO", "ALTO", "MUY_ALTO"];

export const MAX_PISOS_MEDIO = 2;
export const MAX_AREA_MEDIO_M2 = 500;

export function tipoItsePorRiesgo(nivel: NivelRiesgo): "POSTERIOR" | "PREVIA" {
  return nivel === "BAJO" || nivel === "MEDIO" ? "POSTERIOR" : "PREVIA";
}

const INSPECTORES_REQUERIDOS: Record<NivelRiesgo, number> = {
  BAJO: 1,
  MEDIO: 1,
  ALTO: 2,
  MUY_ALTO: 3,
};

export function inspectoresRequeridos(nivel: NivelRiesgo): number {
  return INSPECTORES_REQUERIDOS[nivel];
}

export type DatosRiesgo = {
  areaM2: number;
  numeroPisos: number;
  tieneSotano: boolean;
  almacenaInflamables: boolean;
  esGrifo: boolean;
  funcion?: string | null;
  numeroCamas?: number | null;
  usoMixtoPatrimonio?: boolean;
  granEscala?: boolean;
};

const idx = (n: NivelRiesgo) => NIVELES.indexOf(n);

function nivelPorUmbrales(valor: number, maxMedio: number, maxAlto: number): number {
  if (valor <= maxMedio) return idx("MEDIO");
  return valor <= maxAlto ? idx("ALTO") : idx("MUY_ALTO");
}

// Matriz CENEPRED de Hospedaje: el nivel más alto entre criterios; nunca BAJO.
function nivelHospedaje(datos: DatosRiesgo): NivelRiesgo {
  const niveles = [
    nivelPorUmbrales(datos.numeroPisos, 2, 4),
    nivelPorUmbrales(datos.areaM2, 500, 3000),
  ];
  if (datos.numeroCamas != null) {
    niveles.push(nivelPorUmbrales(datos.numeroCamas, 20, 100));
  }
  if (datos.tieneSotano || datos.usoMixtoPatrimonio) niveles.push(idx("ALTO"));
  if (datos.granEscala) niveles.push(idx("MUY_ALTO"));
  return NIVELES[Math.max(...niveles)];
}

export function sugerirNivelRiesgo(datos: DatosRiesgo): NivelRiesgo {
  if (datos.esGrifo) return "MEDIO";
  if (datos.funcion === "HOSPEDAJE") return nivelHospedaje(datos);
  const base =
    datos.numeroPisos > MAX_PISOS_MEDIO || datos.areaM2 > MAX_AREA_MEDIO_M2
      ? NIVELES.indexOf("ALTO")
      : NIVELES.indexOf("MEDIO");
  const factores =
    Number(datos.tieneSotano) + Number(datos.almacenaInflamables);
  return NIVELES[Math.min(base + factores, NIVELES.length - 1)];
}
