import { z } from "zod";

export const designacionSchema = z.object({
  inspectorIds: z
    .array(z.uuid())
    .min(1, "Elige al menos un inspector.")
    .max(3, "Elige como máximo 3 inspectores."),
});

export type DesignacionInput = z.infer<typeof designacionSchema>;
