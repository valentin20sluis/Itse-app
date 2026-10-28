const base = { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric" } as const;
const soloFecha = new Intl.DateTimeFormat("es-PE", base);
const conHora = new Intl.DateTimeFormat("es-PE", {
  ...base,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function armar(fmt: Intl.DateTimeFormat, date: Date, conHoras: boolean): string {
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  const fecha = `${p.day}/${p.month}/${p.year}`;
  return conHoras ? `${fecha} ${p.hour}:${p.minute}` : fecha;
}

export function formatFecha(date: Date): string {
  return armar(soloFecha, date, false);
}

export function formatFechaHora(date: Date): string {
  return armar(conHora, date, true);
}
