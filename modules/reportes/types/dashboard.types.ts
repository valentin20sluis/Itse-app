import type { EstadoExpediente } from "@/modules/reportes/constants/estados-orden";
import type { CertificadosPorVencimiento } from "@/modules/reportes/services/certificados-vencimiento.service";
import type { ConteoMes } from "@/modules/reportes/utils/rango-fechas";

export type IndicadoresDashboard = {
  porRevisar: number;
  enRevision: number;
  pendientesJefatura: number;
  inspeccionesSemana: number;
  subsanacionPorVencer: number;
  certificadosPorVencer: number;
};

export type DashboardPanel = {
  indicadores: IndicadoresDashboard;
  porEstado: { estado: EstadoExpediente; cantidad: number }[];
  porMes: ConteoMes[];
  certificados: CertificadosPorVencimiento;
};
