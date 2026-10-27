import { Badge } from "@/components/ui/badge";
import { ESTADO_LABELS, type EstadoExpediente } from "@/modules/expedientes/constants/estado-labels";

export function EstadoBadge({ estado }: { estado: EstadoExpediente }) {
  const { label, variant } = ESTADO_LABELS[estado];
  return <Badge variant={variant}>{label}</Badge>;
}
