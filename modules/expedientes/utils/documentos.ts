import type { TipoDocumento } from "@/modules/expedientes/types/expediente.types";

export const DOCUMENTOS: readonly {
  tipo: TipoDocumento;
  etiqueta: string;
  requerido: boolean;
}[] = [
  { tipo: "PLANO_UBICACION", etiqueta: "Plano de ubicación", requerido: true },
  { tipo: "PLANO_DISTRIBUCION", etiqueta: "Plano de distribución", requerido: true },
  { tipo: "PLAN_SEGURIDAD", etiqueta: "Plan de seguridad", requerido: true },
  { tipo: "COMPROBANTE_PAGO", etiqueta: "Comprobante de pago", requerido: true },
  { tipo: "POZO_TIERRA", etiqueta: "Certificado de pozo a tierra", requerido: false },
  { tipo: "EXTINTORES", etiqueta: "Certificado de extintores", requerido: false },
];

export function documentosFaltantes(
  subidos: readonly TipoDocumento[],
): TipoDocumento[] {
  return DOCUMENTOS.filter((d) => d.requerido && !subidos.includes(d.tipo)).map(
    (d) => d.tipo,
  );
}
