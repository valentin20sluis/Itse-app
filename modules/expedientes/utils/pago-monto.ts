type EntradaMontoPago = {
  amountTotal: number | null;
  /** Monto guardado en el expediente al abrir la sesión. */
  tasaMonto: number | null;
  /** `metadata.tipoItse` de la sesión; ausente en sesiones anteriores a la migración. */
  tipoSesion: string | undefined;
  tipoActual: string;
  /** Monto vigente según el riesgo actual; solo se usa si el expediente no guardó monto. */
  montoActual: number;
};

export function validarMontoPago(e: EntradaMontoPago): boolean {
  if (e.tipoSesion !== undefined && e.tipoSesion !== e.tipoActual) return false;
  return e.amountTotal === (e.tasaMonto ?? e.montoActual);
}
