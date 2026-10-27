import type {
  Expediente,
  NivelRiesgo,
  TipoDocumento,
} from "@/modules/expedientes/types/expediente.types";

export const DOCUMENTOS: readonly { tipo: TipoDocumento; etiqueta: string }[] = [
  { tipo: "DNI_AMBAS_CARAS", etiqueta: "DNI (ambas caras, en un solo PDF)" },
  {
    tipo: "ACREDITACION_REPRESENTACION",
    etiqueta: "Documento que acredita la representación (poder, designación u otro)",
  },
  { tipo: "FICHA_RUC", etiqueta: "Ficha RUC" },
  { tipo: "EXTINTORES_PQS", etiqueta: "Certificado de extintores PQS" },
  { tipo: "EXTINTORES_TIPO_K", etiqueta: "Certificado de extintores Tipo K" },
  { tipo: "CAPACITACION_EXTINTORES", etiqueta: "Constancia de capacitación en uso de extintores" },
  { tipo: "LICENCIA_OSINERGMIN", etiqueta: "Licencia o certificado de Osinergmin" },
  { tipo: "PLAN_SEGURIDAD", etiqueta: "Plan de seguridad" },
  { tipo: "PLANO_ARQUITECTURA_AFORO", etiqueta: "Plano de arquitectura con cálculo de aforo" },
  { tipo: "PLANOS_ELECTRICOS", etiqueta: "Planos eléctricos" },
  { tipo: "POZO_TIERRA", etiqueta: "Certificado de pozo a tierra" },
  { tipo: "MEMORIA_PRUEBAS_EQUIPOS", etiqueta: "Memoria descriptiva y pruebas de equipos" },
];

export const DOCUMENTOS_SOLICITANTE: readonly TipoDocumento[] = [
  "DNI_AMBAS_CARAS",
  "ACREDITACION_REPRESENTACION",
];
export const TIPOS_SOLO_PDF: readonly TipoDocumento[] = DOCUMENTOS_SOLICITANTE;

export type ContextoDocumentos = {
  nivelRiesgo: NivelRiesgo | null;
  calidadSolicitante: Expediente["calidadSolicitante"];
  tieneCocina: boolean;
  esGrifo: boolean;
  almacenaInflamables: boolean;
  numeroPisos: number;
};

const esAlto = (n: NivelRiesgo) => n === "ALTO" || n === "MUY_ALTO";

export function documentosRequeridos(ctx: ContextoDocumentos): TipoDocumento[] {
  const { nivelRiesgo: nivel } = ctx;
  if (!nivel) return [];
  const alto = esAlto(nivel);
  const requeridos = new Set<TipoDocumento>([
    "DNI_AMBAS_CARAS",
    "FICHA_RUC",
    "EXTINTORES_PQS",
    "CAPACITACION_EXTINTORES",
  ]);
  if (ctx.calidadSolicitante !== "PROPIETARIO") requeridos.add("ACREDITACION_REPRESENTACION");
  if (ctx.tieneCocina) requeridos.add("EXTINTORES_TIPO_K");
  if (ctx.esGrifo) requeridos.add("LICENCIA_OSINERGMIN");
  // Medio de 2+ pisos lo pide; con más de 2 pisos el local ya es Alto. Bajo y Medio de 1 piso no.
  if (alto || (nivel === "MEDIO" && ctx.numeroPisos >= 2)) requeridos.add("PLAN_SEGURIDAD");
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

// El pozo a tierra es opcional en riesgo bajo y medio: algunos negocios pequeños no lo tienen.
export function documentosOpcionales(ctx: ContextoDocumentos): TipoDocumento[] {
  return ctx.nivelRiesgo === "BAJO" || ctx.nivelRiesgo === "MEDIO" ? ["POZO_TIERRA"] : [];
}

export function documentosFaltantes(
  subidos: readonly TipoDocumento[],
  ctx: ContextoDocumentos,
): TipoDocumento[] {
  return documentosRequeridos(ctx).filter((t) => !subidos.includes(t));
}
