import { cache } from "react";
import { db } from "@/db";
import { tasas } from "@/db/schema";
import type { Tasas } from "@/modules/expedientes/constants/tasa";

// `cache` solo evita repetir la consulta dentro de una misma petición; no hay caché entre peticiones.
export const getTasas = cache(async (): Promise<Tasas> => {
  const filas = await db.select().from(tasas);
  const posterior = filas.find((f) => f.tipoItse === "POSTERIOR");
  const previa = filas.find((f) => f.tipoItse === "PREVIA");
  if (!posterior || !previa) throw new Error("Tasa no configurada");
  return { POSTERIOR: posterior.montoCentimos, PREVIA: previa.montoCentimos };
});
