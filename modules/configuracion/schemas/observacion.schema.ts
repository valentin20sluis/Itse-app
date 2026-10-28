import { z } from "zod";

export const observacionSchema = z.object({
  descripcion: z
    .string({ error: "Escribe la descripción de la observación." })
    .trim()
    .min(10, { error: "La descripción debe tener al menos 10 caracteres." })
    .max(200, { error: "La descripción no puede pasar de 200 caracteres." }),
});

export const observacionIdSchema = z.uuid();

export type ObservacionInput = z.infer<typeof observacionSchema>;
