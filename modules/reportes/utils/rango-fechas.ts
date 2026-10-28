import { aInputLima, parseFechaLima } from "@/modules/inspecciones/utils/fecha-diligencia";

const DIA_MS = 86_400_000;
const MAX_DIAS_RANGO = 366;
const MESES_POR_DEFECTO = 5;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export type RangoFechas = {
  desde: Date;
  hastaExclusivo: Date;
  desdeInput: string;
  hastaInput: string;
};

export type ConteoMes = { clave: string; cantidad: number };

function claveMes(anio: number, mes0: number): string {
  const total = anio * 12 + mes0;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

// Claves `YYYY-MM` (Lima) de los `n` meses que terminan en el mes de `ahora`.
export function ultimosMeses(n: number, ahora: Date = new Date()): string[] {
  const [anio, mes] = aInputLima(ahora).split("-").map(Number);
  return Array.from({ length: n }, (_, i) => claveMes(anio, mes - 1 - (n - 1 - i)));
}

export function rangoDesdeHasta(desde?: string, hasta?: string, ahora: Date = new Date()): RangoFechas {
  const hoy = parseFechaLima(aInputLima(ahora)) as Date;
  const inicioDefecto = parseFechaLima(`${ultimosMeses(MESES_POR_DEFECTO + 1, ahora)[0]}-01`) as Date;

  const d = desde === undefined ? inicioDefecto : parseFechaLima(desde);
  const h = hasta === undefined ? hoy : parseFechaLima(hasta);

  let ini = inicioDefecto;
  let fin = hoy;
  if (d && h) {
    const finAcotado = h.getTime() > hoy.getTime() ? hoy : h;
    if (d.getTime() <= finAcotado.getTime()) {
      ini = d;
      fin = finAcotado;
    }
  }
  if ((fin.getTime() - ini.getTime()) / DIA_MS + 1 > MAX_DIAS_RANGO) {
    ini = new Date(fin.getTime() - (MAX_DIAS_RANGO - 1) * DIA_MS);
  }

  return {
    desde: ini,
    hastaExclusivo: new Date(fin.getTime() + DIA_MS),
    desdeInput: aInputLima(ini),
    hastaInput: aInputLima(fin),
  };
}

// Meses (Lima) tocados por [desde, hastaExclusivo), en orden y sin huecos.
export function clavesMeses(desde: Date, hastaExclusivo: Date): string[] {
  const [a0, m0] = aInputLima(desde).split("-").map(Number);
  const [a1, m1] = aInputLima(new Date(hastaExclusivo.getTime() - 1)).split("-").map(Number);
  const cantidad = (a1 * 12 + m1) - (a0 * 12 + m0) + 1;
  return Array.from({ length: Math.max(cantidad, 0) }, (_, i) => claveMes(a0, m0 - 1 + i));
}

export function etiquetaMes(clave: string): string {
  const [anio, mes] = clave.split("-");
  return `${MESES[Number(mes) - 1]} ${anio}`;
}

export function rellenarMeses(claves: string[], filas: ConteoMes[]): ConteoMes[] {
  const porClave = new Map(filas.map((f) => [f.clave, f.cantidad]));
  return claves.map((clave) => ({ clave, cantidad: porClave.get(clave) ?? 0 }));
}
