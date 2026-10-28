import type {
  AuditoriaConfigItem,
  EntidadConfiguracion,
} from "@/modules/configuracion/services/auditoria-configuracion.service";

type Item = Pick<AuditoriaConfigItem, "accion" | "referencia" | "valorAnterior" | "valorNuevo">;

// "2026-12-25" -> "25/12/2026" sin pasar por Date, para no mover el día por la zona horaria.
export function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

// Los montos se guardan en céntimos.
function soles(centimos: string | null): string {
  const n = Number(centimos);
  return Number.isFinite(n) && centimos !== null ? `S/ ${(n / 100).toFixed(2)}` : "—";
}

function describirFeriado(item: Item): string {
  const fecha = fechaCorta(item.referencia);
  switch (item.accion) {
    case "CREAR":
      return `Agregó el feriado “${item.valorNuevo}” (${fecha})`;
    case "EDITAR":
      return `Cambió el nombre de ${fecha}: “${item.valorAnterior}” → “${item.valorNuevo}”`;
    case "ELIMINAR":
      return `Eliminó el feriado “${item.valorAnterior}” (${fecha})`;
    default:
      return `Cambió el feriado de ${fecha}`;
  }
}

const VERBOS_OBSERVACION = {
  CREAR: "Agregó",
  EDITAR: "Cambió",
  ELIMINAR: "Eliminó",
  ACTIVAR: "Reactivó",
  DESACTIVAR: "Desactivó",
} as const;

function describirObservacion(item: Item): string {
  const texto = item.valorNuevo ?? item.valorAnterior ?? item.referencia;
  return `${VERBOS_OBSERVACION[item.accion]} la observación “${texto}”`;
}

function describirTasa(item: Item): string {
  const tipo = item.referencia === "PREVIA" ? "previa" : "posterior";
  return `Cambió la tasa de ITSE ${tipo}: ${soles(item.valorAnterior)} → ${soles(item.valorNuevo)}`;
}

export function describirCambioConfig(entidad: EntidadConfiguracion, item: Item): string {
  switch (entidad) {
    case "FERIADO":
      return describirFeriado(item);
    case "OBSERVACION":
      return describirObservacion(item);
    case "TASA":
      return describirTasa(item);
  }
}
