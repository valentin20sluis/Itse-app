import { Badge } from "@/components/ui/badge";
import { ESTADO_LABELS, etiquetaEstado, type EstadoExpediente } from "@/modules/expedientes/constants/estado-labels";

export function EstadoBadge({ estado, noCumple }: { estado: EstadoExpediente; noCumple?: boolean }) {
  return <Badge variant={ESTADO_LABELS[estado].variant}>{etiquetaEstado(estado, { noCumple })}</Badge>;
}
