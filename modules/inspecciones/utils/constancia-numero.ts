export function numeroConstancia(expedienteNumero: string): string | null {
  const m = /^EXP-(\d{4})-(\d{5})$/.exec(expedienteNumero);
  return m ? `CD-${m[1]}-${m[2]}` : null;
}
