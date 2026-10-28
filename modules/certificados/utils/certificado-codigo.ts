import { randomBytes } from "node:crypto";

// Crockford base32 (sin I, L, O, U): 12 caracteres = 60 bits.
export const ALFABETO_CODIGO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const LONGITUD = 12;

export function generarCodigo(): string {
  // 256 es múltiplo de 32: `& 31` no introduce sesgo.
  return Array.from(randomBytes(LONGITUD), (b) => ALFABETO_CODIGO[b & 31]).join("");
}

export function normalizarCodigo(valor: string): string | null {
  const limpio = valor
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  if (limpio.length !== LONGITUD) return null;
  return [...limpio].every((c) => ALFABETO_CODIGO.includes(c)) ? limpio : null;
}

export function formatCodigo(codigo: string): string {
  return codigo.match(/.{1,4}/g)?.join("-") ?? codigo;
}
