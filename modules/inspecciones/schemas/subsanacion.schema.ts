import { z } from "zod";

export const evaluacionSubsanacionSchema = z.object({
  resultado: z.enum(["CUMPLE", "SIGUE_EN_SUBSANACION", "NO_CUMPLE"], { error: "Elige el resultado." }),
  informe: z
    .string()
    .trim()
    .min(10, "Escribe un informe de al menos 10 caracteres.")
    .max(1000, "El informe no puede superar los 1000 caracteres."),
});
