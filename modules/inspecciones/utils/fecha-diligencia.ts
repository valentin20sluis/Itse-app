// Lima es UTC-5 todo el año (sin horario de verano), por eso basta un desfase fijo.
const LIMA_OFFSET_H = 5;
const DIA_MS = 86_400_000;
export const MAX_DIAS = 90;
const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/;

export type ProgramacionValidacion = "ok" | "pasada" | "muy_lejana";

// "YYYY-MM-DD" -> inicio de ese día en Lima (00:00 UTC-5 = 05:00 UTC).
export function parseFechaLima(valor: string): Date | null {
  const m = FORMATO.exec(valor);
  if (!m) return null;
  const [anio, mes, dia] = m.slice(1).map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia, LIMA_OFFSET_H));
  // Date.UTC normaliza fechas imposibles (31 de febrero): se descartan comparando el viaje de ida y vuelta.
  return aInputLima(fecha) === valor ? fecha : null;
}

// Fecha calendario (YYYY-MM-DD) de Lima de un instante.
export function aInputLima(fecha: Date): string {
  return new Date(fecha.getTime() - LIMA_OFFSET_H * 3_600_000).toISOString().slice(0, 10);
}

// `fecha` es el inicio de día en Lima; hoy es válido y hoy + 90 días también.
export function validarProgramacion(fecha: Date, ahora: Date): ProgramacionValidacion {
  const hoy = (parseFechaLima(aInputLima(ahora)) as Date).getTime();
  if (fecha.getTime() < hoy) return "pasada";
  if (fecha.getTime() > hoy + MAX_DIAS * DIA_MS) return "muy_lejana";
  return "ok";
}
