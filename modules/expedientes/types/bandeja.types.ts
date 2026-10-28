import type { Establecimiento } from "@/db/schema";
import type {
  Expediente,
  ExpedienteDocumento,
  EstadoExpediente,
  NivelRiesgo,
  TipoTramite,
} from "@/modules/expedientes/types/expediente.types";

export type ExpedientePanelItem = {
  id: string;
  numero: string;
  establecimientoNombre: string;
  clienteNombre: string;
  tipoTramite: TipoTramite;
  nivelRiesgo: NivelRiesgo | null;
  estado: EstadoExpediente;
  presentadoAt: Date | null;
};

export type BandejaResultado = {
  items: ExpedientePanelItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type HistorialItem = {
  id: string;
  estadoAnterior: EstadoExpediente | null;
  estadoNuevo: EstadoExpediente;
  comentario: string | null;
  createdAt: Date;
  actorNombre?: string;
};

export type ExpedienteDetalle = {
  expediente: Expediente;
  establecimiento: Establecimiento;
  solicitante: {
    nombre: string | null;
    documento: string | null;
    telefono: string | null;
    email: string | null;
    calidad: Expediente["calidadSolicitante"];
    razonSocial: string | null;
  };
  documentos: ExpedienteDocumento[];
  historial: HistorialItem[];
};
