import { z } from "zod";
import { parseFechaLima } from "@/modules/inspecciones/utils/fecha-diligencia";

export const programacionSchema = z.object({
  programadaPara: z
    .string()
    .refine((v) => parseFechaLima(v) !== null, "Elige una fecha válida.")
    .transform((v) => parseFechaLima(v) as Date),
});

export const resultadoDiligenciaSchema = z.object({
  resultado: z.enum(["CUMPLE", "NO_CUMPLE"], { error: "Elige el resultado." }),
  informe: z
    .string()
    .trim()
    .min(10, "Escribe un informe de al menos 10 caracteres.")
    .max(1000, "El informe no puede superar los 1000 caracteres."),
});

export type ResultadoDiligenciaInput = z.infer<typeof resultadoDiligenciaSchema>;
