import type { profesionInspectorEnum } from "@/db/schema";

export type ProfesionInspector = (typeof profesionInspectorEnum.enumValues)[number];

export const PROFESION_LABELS: Record<ProfesionInspector, string> = {
  ARQUITECTO: "Arquitecto",
  ING_CIVIL: "Ing. Civil",
  ING_INDUSTRIAL: "Ing. Industrial",
  ING_ELECTRICA: "Ing. Eléctrica",
  ING_MECANICA_ELECTRICA: "Ing. Mecánica Eléctrica",
};

export const PROFESION_VALUES = Object.keys(PROFESION_LABELS) as [
  ProfesionInspector,
  ...ProfesionInspector[],
];
