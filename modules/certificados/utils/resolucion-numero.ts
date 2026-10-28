export function formatNumeroResolucion(anio: number, n: number): string {
  return `RG-${anio}-${String(n).padStart(4, "0")}`;
}

export function esNumeroResolucion(valor: string): boolean {
  return /^RG-\d{4}-\d{4,}$/.test(valor);
}
