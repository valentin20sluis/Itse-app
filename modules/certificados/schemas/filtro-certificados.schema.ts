import { z } from "zod";

export const FILTROS_CERTIFICADOS = ["todos", "por-vencer", "vencidos"] as const;

// Un valor desconocido de la URL cae a "todos": el listado nunca falla por un enlace mal armado.
export const filtroCertificadosSchema = z.object({
  filtro: z.enum(FILTROS_CERTIFICADOS).catch("todos"),
});

export type FiltroCertificados = z.infer<typeof filtroCertificadosSchema>["filtro"];
