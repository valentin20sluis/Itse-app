import { z } from "zod";

const texto = (campo: string, min: number, max: number) =>
  z
    .string({ error: `Ingresa ${campo}.` })
    .trim()
    .min(1, `Ingresa ${campo}.`)
    .min(min, `Debe tener al menos ${min} caracteres.`)
    .max(max, `Debe tener como máximo ${max} caracteres.`);

export const establecimientoSchema = z.object({
  nombreComercial: texto("el nombre comercial", 3, 100),
  direccion: texto("la dirección", 5, 200),
  distrito: texto("el distrito", 2, 80),
  giro: texto("el giro o actividad", 3, 100),
  areaM2: z.coerce
    .number({ error: "Ingresa un área válida en m²." })
    .gt(0, "El área debe ser mayor que 0.")
    .max(100000, "El área no puede superar 100000 m²."),
  numeroPisos: z.coerce
    .number({ error: "Ingresa un número de pisos válido." })
    .int("El número de pisos debe ser un entero.")
    .min(1, "Debe tener al menos 1 piso.")
    .max(50, "No puede tener más de 50 pisos."),
});

export type EstablecimientoInput = z.infer<typeof establecimientoSchema>;
