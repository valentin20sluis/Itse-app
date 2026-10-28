import { z } from "zod";

export const evaluacionSubsanacionSchema = z.object({
  resultado: z.enum(["CUMPLE", "SIGUE_EN_SUBSANACION", "NO_CUMPLE"], { error: "Elige el resultado." }),
});
