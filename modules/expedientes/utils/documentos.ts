import type {
  NivelRiesgo,
  TipoDocumento,
} from "@/modules/expedientes/types/expediente.types";
import {
  MAX_AREA_MEDIO_M2,
  MAX_PISOS_MEDIO,
} from "@/modules/expedientes/utils/riesgo";

export const DOCUMENTOS: readonly { tipo: TipoDocumento; etiqueta: string }[] = [
  { tipo: "FICHA_RUC", etiqueta: "Ficha RUC" },
  { tipo: "EXTINTORES_PQS", etiqueta: "Certificado de extintores PQS" },
  { tipo: "EXTINTORES_TIPO_K", etiqueta: "Certificado de extintores Tipo K" },
  { tipo: "CAPACITACION_EXTINTORES", etiqueta: "Constancia de capacitación en uso de extintores" },
  { tipo: "LICENCIA_OSINERGMIN", etiqueta: "Licencia o certificado de Osinergmin" },
  { tipo: "PLANO_ARQUITECTURA_AFORO", etiqueta: "Plano de arquitectura con cálculo de aforo" },
  { tipo: "PLANOS_ELECTRICOS", etiqueta: "Planos eléctricos" },
  { tipo: "POZO_TIERRA", etiqueta: "Certificado de pozo a tierra" },
  { tipo: "MEMORIA_PRUEBAS_EQUIPOS", etiqueta: "Memoria descriptiva y pruebas de equipos" },
];

export type ContextoDocumentos = {
  nivelRiesgo: NivelRiesgo | null;
  tieneCocina: boolean;
  esGrifo: boolean;
  almacenaInflamables: boolean;
};

const esAlto = (n: NivelRiesgo) => n === "ALTO" || n === "MUY_ALTO";

export function documentosRequeridos(ctx: ContextoDocumentos): TipoDocumento[] {
  const { nivelRiesgo: nivel } = ctx;
  if (!nivel) return [];
  const alto = esAlto(nivel);
  const requeridos = new Set<TipoDocumento>([
    "FICHA_RUC",
    "EXTINTORES_PQS",
    "CAPACITACION_EXTINTORES",
  ]);
  if (ctx.tieneCocina) requeridos.add("EXTINTORES_TIPO_K");
  if (ctx.esGrifo || (ctx.almacenaInflamables && alto)) requeridos.add("LICENCIA_OSINERGMIN");
  if (alto) {
    for (const t of [
      "PLANO_ARQUITECTURA_AFORO",
      "PLANOS_ELECTRICOS",
      "POZO_TIERRA",
      "MEMORIA_PRUEBAS_EQUIPOS",
    ] as const)
      requeridos.add(t);
  }
  return DOCUMENTOS.map((d) => d.tipo).filter((t) => requeridos.has(t));
}

export function documentosFaltantes(
  subidos: readonly TipoDocumento[],
  ctx: ContextoDocumentos,
): TipoDocumento[] {
  return documentosRequeridos(ctx).filter((t) => !subidos.includes(t));
}

export function planSeguridadFisico(d: {
  nivelRiesgo: NivelRiesgo | null;
  numeroPisos: number;
  tieneSotano: boolean;
  areaM2: number;
}): boolean {
  if (!d.nivelRiesgo) return false;
  if (esAlto(d.nivelRiesgo)) return true;
  return (
    d.numeroPisos <= MAX_PISOS_MEDIO && !d.tieneSotano && d.areaM2 <= MAX_AREA_MEDIO_M2
  );
}
