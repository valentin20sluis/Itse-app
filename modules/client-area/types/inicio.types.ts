import type { CertificadoClienteFila } from "@/modules/certificados/services/certificado-lista.service";
import type { EstadoExpediente } from "@/modules/expedientes/constants/estado-labels";

export type PasoSiguiente = {
  expedienteId: string;
  establecimientoNombre: string;
  numero: string | null;
  estado: EstadoExpediente;
  noCumple: boolean;
  mensaje: string;
  motivo?: string;
  accion: { label: string; href: string; ariaLabel: string };
  // 0 = requiere acción del cliente, 1 = en espera, 2 = terminado.
  urgencia: 0 | 1 | 2;
};

export type EstablecimientoInicio = {
  id: string;
  nombre: string;
  libre: boolean;
  // «Disponible», el número del expediente o «Borrador».
  detalle: string;
};

export type ResumenCertificados = {
  total: number;
  vigentes: number;
  porVencer: number;
  vencidos: number;
  // Por vencer o vencidos, del vencimiento más próximo al más lejano.
  avisos: CertificadoClienteFila[];
};

export type InicioCliente = {
  pasos: PasoSiguiente[];
  expedientes: { total: number; enCurso: number; finalizados: number };
  establecimientos: {
    total: number;
    conSolicitud: number;
    libres: number;
    lista: EstablecimientoInicio[];
  };
  certificados: ResumenCertificados;
  puedeSolicitar: boolean;
};
