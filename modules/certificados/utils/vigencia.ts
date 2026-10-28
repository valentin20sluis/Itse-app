import { aInputLima, parseFechaLima } from "@/modules/inspecciones/utils/fecha-diligencia";

export const VIGENCIA_ANIOS = 2;
export const DIAS_ALERTA_VENCIMIENTO = 60;
const DIA_MS = 86_400_000;

export type EstadoCertificado = "VIGENTE" | "POR_VENCER" | "VENCIDO" | "REVOCADO";

// Misma fecha calendario de Lima + 2 años (29/02 pasa a 28/02), como inicio de día en Lima.
export function calcularVencimiento(emision: Date): Date {
  const [anio, mes, dia] = aInputLima(emision).split("-");
  const destino = `${Number(anio) + VIGENCIA_ANIOS}-${mes}`;
  return (parseFechaLima(`${destino}-${dia}`) ?? parseFechaLima(`${destino}-28`)) as Date;
}

// Días calendario de Lima hasta el vencimiento: 0 el último día, negativo después.
export function diasParaVencer(venceAt: Date, ahora: Date): number {
  const hoy = (parseFechaLima(aInputLima(ahora)) as Date).getTime();
  return Math.round((venceAt.getTime() - hoy) / DIA_MS);
}

export function estadoCertificado(
  c: { venceAt: Date; revocado: boolean },
  ahora: Date,
): EstadoCertificado {
  if (c.revocado) return "REVOCADO";
  const dias = diasParaVencer(c.venceAt, ahora);
  if (dias < 0) return "VENCIDO";
  return dias <= DIAS_ALERTA_VENCIMIENTO ? "POR_VENCER" : "VIGENTE";
}
