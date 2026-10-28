import { z } from "zod";

import { estadoExpedienteEnum, nivelRiesgoEnum } from "@/db/schema";
import { rangoDesdeHasta } from "@/modules/reportes/utils/rango-fechas";

const textoOpcional = z.string().optional().catch(undefined);

// Toda entrada inválida de la URL se ignora: el reporte nunca falla por un enlace mal armado.
export const filtrosReporteSchema = z
  .object({
    desde: textoOpcional,
    hasta: textoOpcional,
    estado: z.enum(estadoExpedienteEnum.enumValues).exclude(["BORRADOR"]).optional().catch(undefined),
    riesgo: z.enum(nivelRiesgoEnum.enumValues).optional().catch(undefined),
    distrito: z
      .string()
      .transform((v) => v.trim().slice(0, 60))
      .transform((v) => v || undefined)
      .optional()
      .catch(undefined),
  })
  .transform(({ desde, hasta, ...resto }) => {
    const rango = rangoDesdeHasta(desde, hasta);
    return { desde: rango.desdeInput, hasta: rango.hastaInput, ...resto };
  });

export type FiltrosReporte = z.infer<typeof filtrosReporteSchema>;
