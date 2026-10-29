import { z } from "zod";

// ponytail: el mínimo de S/ 5.00 no está verificado contra Stripe en PEN; confirmar en modo prueba.
export const TASA_MIN_CENTIMOS = 500;
export const TASA_MAX_CENTIMOS = 500_000;

const FORMATO = /^\d+([.,]\d{1,2})?$/;

/** Convierte "150", "150.50" o "150,5" a céntimos sin aritmética de coma flotante. */
export function solesACentimos(texto: string): number | null {
  const t = texto.trim();
  if (!FORMATO.test(t)) return null;
  const [enteros, decimales = ""] = t.split(/[.,]/);
  return Number(enteros) * 100 + Number(decimales.padEnd(2, "0"));
}

const montoSchema = z
  .string({ error: "Escribe el monto." })
  .trim()
  .min(1, { error: "Escribe el monto.", abort: true })
  .refine((v) => solesACentimos(v) !== null, {
    error: "Escribe un monto válido, por ejemplo 150 o 150.50.",
    abort: true,
  })
  .refine(
    (v) => {
      const c = solesACentimos(v)!;
      return c >= TASA_MIN_CENTIMOS && c <= TASA_MAX_CENTIMOS;
    },
    { error: "El monto debe estar entre S/ 5.00 y S/ 5,000.00." },
  )
  .transform((v) => solesACentimos(v)!);

export const tasasSchema = z.object({ posterior: montoSchema, previa: montoSchema });

export type TasasInput = z.infer<typeof tasasSchema>;
