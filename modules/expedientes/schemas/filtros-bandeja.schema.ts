import { z } from "zod";

import { estadoExpedienteEnum } from "@/db/schema";

export const PAGE_SIZE = 20;

// Toda entrada inválida de la URL cae al valor por defecto: la bandeja nunca falla por un enlace mal armado.
export const filtrosBandejaSchema = z.object({
  estado: z.enum(estadoExpedienteEnum.enumValues).exclude(["BORRADOR"]).optional().catch(undefined),
  pendientes: z.literal("jefatura").optional().catch(undefined),
  q: z
    .string()
    .transform((v) => v.trim().slice(0, 30))
    .transform((v) => v || undefined)
    .optional()
    .catch(undefined),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1))
    .catch(1),
});

export type FiltrosBandeja = z.infer<typeof filtrosBandejaSchema>;
