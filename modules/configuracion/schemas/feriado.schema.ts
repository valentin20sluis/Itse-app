import { z } from "zod";
import { parseFechaLima } from "@/modules/inspecciones/utils/fecha-diligencia";

const MENSAJE_FECHA = "Elige una fecha válida entre 2020 y 2100.";

export const feriadoNombreSchema = z
  .string({ error: "Escribe el nombre del feriado." })
  .trim()
  .min(3, { error: "El nombre debe tener al menos 3 caracteres." })
  .max(80, { error: "El nombre no puede pasar de 80 caracteres." });

export const feriadoFechaSchema = z
  .string({ error: MENSAJE_FECHA })
  .refine((v) => {
    if (parseFechaLima(v) === null) return false;
    const anio = Number(v.slice(0, 4));
    return anio >= 2020 && anio <= 2100;
  }, { error: MENSAJE_FECHA });

export const feriadoSchema = z.object({
  fecha: feriadoFechaSchema,
  nombre: feriadoNombreSchema,
});

export type FeriadoInput = z.infer<typeof feriadoSchema>;
