export function formatNumeroCertificado(anio: number, n: number): string {
  return `${String(n).padStart(4, "0")}-${anio}`;
}

export function esNumeroCertificado(valor: string): boolean {
  return /^\d{4,}-\d{4}$/.test(valor);
}
