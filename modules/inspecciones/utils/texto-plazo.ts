export function textoDiasRestantes(diasRestantes: number): string {
  if (diasRestantes === 0) return "Vence hoy";
  return `Quedan ${diasRestantes} ${diasRestantes === 1 ? "día hábil" : "días hábiles"}`;
}
