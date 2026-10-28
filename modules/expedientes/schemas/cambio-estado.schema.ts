import { z } from "zod";

import { requiereMotivo } from "@/modules/expedientes/utils/transiciones";

export const cambioEstadoSchema = z
  .object({
    hasta: z.enum(
      ["EN_REVISION", "OBSERVADO_REQUISITOS", "ENVIADO_JEFATURA", "APROBADO_JEFATURA", "ANULADO"],
      { error: "Elige una acción válida." },
    ),
    comentario: z
      .string()
      .trim()
      .max(500, "El motivo no puede superar los 500 caracteres.")
      .transform((v) => v || undefined),
  })
  .superRefine((v, ctx) => {
    if (requiereMotivo(v.hasta) && (v.comentario?.length ?? 0) < 10) {
      ctx.addIssue({
        code: "custom",
        path: ["comentario"],
        message: "Escribe un motivo de al menos 10 caracteres.",
      });
    }
  });

export const cambioRiesgoSchema = z.object({
  nivelRiesgo: z.enum(["BAJO", "MEDIO", "ALTO", "MUY_ALTO"], { error: "Elige un nivel de riesgo." }),
  nota: z
    .string()
    .trim()
    .min(10, "Escribe una nota de al menos 10 caracteres.")
    .max(500, "La nota no puede superar los 500 caracteres."),
});
