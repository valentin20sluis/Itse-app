export type ObservacionCatalogo = { codigo: string; descripcion: string };

// Observaciones no relevantes en términos de riesgo (reglas-negocio 7.3).
// Pendiente: completar la lista con el Anexo 9 oficial del CENEPRED.
export const OBSERVACIONES_NO_RELEVANTES: readonly ObservacionCatalogo[] = [
  {
    codigo: "RETIRAR_OBSTACULOS_EVACUACION",
    descripcion:
      "Retirar obstáculos de los medios de evacuación (pasadizos, escaleras, accesos, salidas).",
  },
  {
    codigo: "COLOCAR_SENALIZACION",
    descripcion:
      "Colocar señalización de seguridad (salida, zona segura en caso de sismo, riesgo eléctrico, extintores).",
  },
  {
    codigo: "EXTINTORES",
    descripcion: "Instalar, recargar o reubicar extintores.",
  },
  {
    codigo: "TAPAS_TABLEROS_ELECTRICOS",
    descripcion: "Colocar tapas a las aberturas no usadas en los tableros eléctricos.",
  },
  {
    codigo: "TAPA_CAJAS_DE_PASO",
    descripcion: "Colocar tapa a las cajas de paso de conductores eléctricos.",
  },
  {
    codigo: "ILUMINACION_TABLEROS",
    descripcion:
      "Instalar iluminación general y de emergencia en la zona de los tableros eléctricos.",
  },
];

export function buscarObservacion(codigo: string): ObservacionCatalogo | undefined {
  return OBSERVACIONES_NO_RELEVANTES.find((o) => o.codigo === codigo);
}
