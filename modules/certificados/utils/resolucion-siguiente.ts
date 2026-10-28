import { sql } from "drizzle-orm";

// Correlativo RG-AAAA-NNNN del año dentro del UPDATE (max + 1) sobre la unión de las resoluciones con
// certificado y las de no cumple; el índice único de cada tabla detecta choques concurrentes.
// ponytail: no hay unicidad entre tablas; tabla única de resoluciones si la carrera cruzada importa.
export function resolucionSiguiente(anio: number) {
  const patron = `RG-${anio}-%`;
  return sql`(select 'RG-' || ${String(anio)}::text || '-' || lpad(n::text, greatest(4, length(n::text)), '0')
    from (select coalesce(max(split_part(numero, '-', 3)::int), 0) + 1 as n
      from (
        select resolucion_numero as numero from certificados where resolucion_numero like ${patron}
        union all
        select resolucion_no_cumple_numero as numero from expedientes where resolucion_no_cumple_numero like ${patron}
      ) u) t)`;
}
