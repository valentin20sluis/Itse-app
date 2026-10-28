import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";
import type { EstadoCertificado } from "@/modules/certificados/utils/vigencia";

export const CERTIFICADO_ESTADO_LABELS: Record<
  EstadoCertificado,
  { label: string; variant: NonNullable<VariantProps<typeof badgeVariants>["variant"]> }
> = {
  VIGENTE: { label: "Vigente", variant: "default" },
  POR_VENCER: { label: "Por vencer", variant: "secondary" },
  VENCIDO: { label: "Vencido", variant: "destructive" },
  REVOCADO: { label: "Anulado", variant: "outline" },
};
