import { aInputLima, parseFechaLima } from "@/modules/inspecciones/utils/fecha-diligencia";

const DIA_MS = 86_400_000;

// Inicio de día en Lima de la fecha de un instante.
function inicioDiaLima(fecha: Date): Date {
  return parseFechaLima(aInputLima(fecha)) as Date;
}

function sumarDias(inicioDia: Date, dias: number): Date {
  return new Date(inicioDia.getTime() + dias * DIA_MS);
}

export function esDiaHabil(fecha: string, feriados: readonly string[]): boolean {
  const inicio = parseFechaLima(fecha);
  if (!inicio) return false;
  // 05:00 UTC cae el mismo día calendario en UTC, así que getUTCDay es el día de semana de Lima.
  const dia = inicio.getUTCDay();
  return dia !== 0 && dia !== 6 && !feriados.includes(fecha);
}

export function sumarDiasHabiles(desde: Date, n: number, feriados: readonly string[]): Date {
  if (!Number.isInteger(n) || n < 0) throw new RangeError("n debe ser un entero >= 0");
  let actual = inicioDiaLima(desde);
  let restantes = n;
  while (restantes > 0) {
    actual = sumarDias(actual, 1);
    if (esDiaHabil(aInputLima(actual), feriados)) restantes--;
  }
  return actual;
}

export function estadoPlazo(
  limite: Date,
  ahora: Date,
  feriados: readonly string[],
): { vencido: boolean; diasRestantes: number } {
  const hoy = inicioDiaLima(ahora);
  const fin = inicioDiaLima(limite);
  const vencido = hoy.getTime() > fin.getTime();
  let diasRestantes = 0;
  for (let d = sumarDias(hoy, 1); d.getTime() <= fin.getTime(); d = sumarDias(d, 1)) {
    if (esDiaHabil(aInputLima(d), feriados)) diasRestantes++;
  }
  return { vencido, diasRestantes };
}
