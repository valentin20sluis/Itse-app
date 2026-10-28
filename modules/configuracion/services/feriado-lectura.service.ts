import { cache } from "react";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { feriados } from "@/db/schema";

// `cache` solo evita repetir la consulta dentro de una misma petición; no hay caché entre peticiones.
export const getFeriados = cache(async (): Promise<string[]> => {
  const filas = await db.select({ fecha: feriados.fecha }).from(feriados).orderBy(asc(feriados.fecha));
  return filas.map((f) => f.fecha);
});
