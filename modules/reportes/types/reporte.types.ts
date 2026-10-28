import type { CertificadosPorVencimiento } from "@/modules/reportes/services/certificados-vencimiento.service";
import type { EstadoExpediente } from "@/modules/reportes/constants/estados-orden";
import type { NivelRiesgo, TipoTramite } from "@/modules/expedientes/types/expediente.types";
import type { ConteoMes } from "@/modules/reportes/utils/rango-fechas";

export const MAX_FILAS_CSV = 2000;

export type Reporte = {
  produccion: ConteoMes[];
  porRiesgo: { riesgo: NivelRiesgo | null; cantidad: number }[];
  porTramite: { tramite: TipoTramite; cantidad: number }[];
  resultados: { cumple: number; noCumple: number; subsanacion: number };
  tiempos: { estado: Exclude<EstadoExpediente, "BORRADOR">; promedioDias: number; cantidad: number }[];
  tiempoEntrega: number | null;
  certificados: { emitidos: number; vencimiento: CertificadosPorVencimiento };
  distritos: string[];
};

export type FilaCsv = {
  numero: string;
  fechaPresentacion: string;
  estado: string;
  nivelRiesgo: string;
  tipoTramite: string;
  distrito: string;
};
