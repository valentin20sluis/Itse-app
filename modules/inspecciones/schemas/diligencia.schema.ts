import { z } from "zod";
import { parseFechaLima } from "@/modules/inspecciones/utils/fecha-diligencia";

export const programacionSchema = z.object({
  programadaPara: z
    .string()
    .refine((v) => parseFechaLima(v) !== null, "Elige una fecha válida.")
    .transform((v) => parseFechaLima(v) as Date),
});

export const resultadoDiligenciaSchema = z
  .object({
    resultado: z.enum(["CUMPLE", "NO_CUMPLE", "EN_SUBSANACION"], { error: "Elige el resultado." }),
    codigos: z.array(z.string()).max(6, "Elige como máximo 6 observaciones del listado.").default([]),
    libres: z
      .array(z.string())
      .default([])
      .transform((lineas) => lineas.map((l) => l.trim()).filter(Boolean))
      .pipe(
        z
          .array(
            z
              .string()
              .min(5, "Cada observación debe tener al menos 5 caracteres.")
              .max(300, "Cada observación puede tener como máximo 300 caracteres."),
          )
          .max(20, "Escribe como máximo 20 observaciones."),
      ),
    reprogramadaPara: z
      .string()
      .optional()
      .transform((v) => v || undefined)
      .refine((v) => v === undefined || parseFechaLima(v) !== null, "Elige una fecha válida.")
      .transform((v) => (v ? (parseFechaLima(v) as Date) : undefined)),
  })
  .superRefine((d, ctx) => {
    const hay = d.codigos.length > 0 || d.libres.length > 0;
    if (d.resultado === "CUMPLE" && hay) {
      ctx.addIssue({ code: "custom", path: ["codigos"], message: "Con «Cumple» no se registran observaciones." });
    }
    if (d.resultado === "EN_SUBSANACION" && !hay) {
      ctx.addIssue({ code: "custom", path: ["codigos"], message: "Agrega al menos una observación." });
    }
  });
