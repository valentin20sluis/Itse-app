const BOM = "﻿";
// Una celda que empieza así se interpreta como fórmula en Excel/Calc.
const INICIO_FORMULA = /^[=+\-@\t\r]/;

function celda(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return '""';
  const texto = typeof valor === "string" && INICIO_FORMULA.test(valor) ? `'${valor}` : String(valor);
  return `"${texto.replaceAll('"', '""')}"`;
}

export function aCsv(filas: (string | number | null | undefined)[][]): string {
  return BOM + filas.map((fila) => fila.map(celda).join(",") + "\r\n").join("");
}
