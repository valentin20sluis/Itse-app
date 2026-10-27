import type { Expediente, ExpedienteDocumento } from "@/db/schema";

export type { Expediente, ExpedienteDocumento };
export type EstadoExpediente = Expediente["estado"];
export type NivelRiesgo = NonNullable<Expediente["nivelRiesgo"]>;
export type TipoTramite = Expediente["tipoTramite"];
export type TipoDocumento = ExpedienteDocumento["tipo"];
export type ExpedienteListItem = Expediente & {
  establecimientoNombre: string;
  pagoPendiente: boolean;
};
