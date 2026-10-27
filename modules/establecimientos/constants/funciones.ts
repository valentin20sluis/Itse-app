import type { funcionEstablecimientoEnum } from "@/db/schema";

export type FuncionEstablecimiento = (typeof funcionEstablecimientoEnum.enumValues)[number];

export const FUNCION_LABELS: Record<FuncionEstablecimiento, string> = {
  ALMACEN: "Almacén",
  COMERCIO: "Comercio",
  ENCUENTRO: "Encuentro",
  EDUCACION: "Educación",
  HOSPEDAJE: "Hospedaje",
  INDUSTRIA: "Industria",
  OFICINAS_ADMINISTRATIVAS: "Oficinas administrativas",
  SALUD: "Salud",
};

export const FUNCION_VALUES = Object.keys(FUNCION_LABELS) as [
  FuncionEstablecimiento,
  ...FuncionEstablecimiento[],
];
