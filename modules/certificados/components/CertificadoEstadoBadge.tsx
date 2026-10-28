import { Badge } from "@/components/ui/badge";
import { CERTIFICADO_ESTADO_LABELS } from "@/modules/certificados/constants/certificado-labels";
import type { EstadoCertificado } from "@/modules/certificados/utils/vigencia";

export function CertificadoEstadoBadge({ estado }: { estado: EstadoCertificado }) {
  const { label, variant } = CERTIFICADO_ESTADO_LABELS[estado];
  return <Badge variant={variant}>{label}</Badge>;
}
