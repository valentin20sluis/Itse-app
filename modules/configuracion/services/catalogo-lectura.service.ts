import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { catalogoObservaciones } from "@/db/schema";
import { assertSuperadmin } from "@/modules/configuracion/services/auditoria-configuracion.service";
import type { ObservacionCatalogo, ObservacionItem } from "@/modules/configuracion/types/configuracion.types";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";

// `cache` solo evita repetir la consulta dentro de una misma petición; no hay caché entre peticiones.
export const getCatalogoActivo = cache(async (): Promise<ObservacionCatalogo[]> => {
  return db
    .select({ codigo: catalogoObservaciones.codigo, descripcion: catalogoObservaciones.descripcion })
    .from(catalogoObservaciones)
    .where(eq(catalogoObservaciones.activo, true))
    .orderBy(asc(catalogoObservaciones.descripcion));
});

export async function listCatalogoCompleto(actor: Actor): Promise<ObservacionItem[]> {
  assertSuperadmin(actor);
  return db
    .select({
      id: catalogoObservaciones.id,
      descripcion: catalogoObservaciones.descripcion,
      activo: catalogoObservaciones.activo,
    })
    .from(catalogoObservaciones)
    .orderBy(asc(catalogoObservaciones.descripcion));
}
