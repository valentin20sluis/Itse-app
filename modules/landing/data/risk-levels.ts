export type RiskLevel = {
  id: "low" | "medium" | "high" | "very-high";
  label: string;
  itseType: "POSTERIOR" | "PREVIA";
  timing: string;
  inspectors: 1 | 2 | 3;
  description: string;
  examples?: string[];
};

const AFTER_LICENSE = "Después de otorgada la licencia";
const BEFORE_LICENSE = "Antes de otorgar la licencia";

export const riskLevels: RiskLevel[] = [
  {
    id: "low",
    label: "Bajo",
    itseType: "POSTERIOR",
    timing: AFTER_LICENSE,
    inspectors: 1,
    description: "Establecimientos de menor riesgo. La inspección se realiza después de la licencia.",
  },
  {
    id: "medium",
    label: "Medio",
    itseType: "POSTERIOR",
    timing: AFTER_LICENSE,
    inspectors: 1,
    description: "Edificaciones de hasta 3 pisos y/o 750 m² de área techada.",
    examples: ["Bodegas", "Librerías", "Boticas", "Minimarkets"],
  },
  {
    id: "high",
    label: "Alto",
    itseType: "PREVIA",
    timing: BEFORE_LICENSE,
    inspectors: 2,
    description: "Edificaciones de más de 3 pisos y/o más de 750 m² de área techada.",
  },
  {
    id: "very-high",
    label: "Muy alto",
    itseType: "PREVIA",
    timing: BEFORE_LICENSE,
    inspectors: 3,
    description: "Establecimientos de mayor riesgo. La inspección se realiza antes de la licencia.",
  },
];
