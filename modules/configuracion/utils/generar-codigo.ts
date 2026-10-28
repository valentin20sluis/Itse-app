const MAX = 60;

// Minúsculas, sin tildes y con espacios colapsados: sirve para comparar descripciones.
export function normalizarDescripcion(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function generarCodigo(descripcion: string, existentes: readonly string[] = []): string {
  const base =
    normalizarDescripcion(descripcion)
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase()
      .slice(0, MAX)
      .replace(/_+$/, "") || "OBSERVACION";
  let codigo = base;
  for (let n = 2; existentes.includes(codigo); n++) {
    const sufijo = `_${n}`;
    codigo = base.slice(0, MAX - sufijo.length).replace(/_+$/, "") + sufijo;
  }
  return codigo;
}
