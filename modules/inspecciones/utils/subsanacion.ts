import type { TipoItse } from "@/modules/inspecciones/utils/plazo-subsanacion";

export type OpcionEvaluacion = "CUMPLE" | "SIGUE_EN_SUBSANACION" | "NO_CUMPLE";

type Contexto = {
  tipoItse: TipoItse;
  // El cliente ya presentó la declaración jurada y el panel fotográfico.
  presentada: boolean;
  vencido: boolean;
};

// reglas-negocio 7.2 y 7.5. En previa los inspectores vuelven, así que no hay evidencia que esperar.
export function opcionesEvaluacion({ tipoItse, presentada, vencido }: Contexto): OpcionEvaluacion[] {
  if (tipoItse === "PREVIA") return ["CUMPLE", "NO_CUMPLE"];
  const opciones: OpcionEvaluacion[] = [];
  if (presentada) opciones.push("CUMPLE");
  if (presentada && !vencido) opciones.push("SIGUE_EN_SUBSANACION");
  opciones.push("NO_CUMPLE");
  return opciones;
}

export function puedeSubirEvidencia({ tipoItse, presentada, vencido }: Contexto): boolean {
  return tipoItse === "POSTERIOR" && !presentada && !vencido;
}
