import type { EstadoCertificado } from "@/modules/certificados/utils/vigencia";

export function avisoCertificado({
  estado,
  diasRestantes,
}: {
  estado: EstadoCertificado;
  diasRestantes: number;
}): string | null {
  if (estado === "VENCIDO")
    return "Tu certificado venció. Inicia una nueva solicitud para renovarlo.";
  if (estado !== "POR_VENCER") return null;
  return `Tu certificado vence en ${diasRestantes} ${diasRestantes === 1 ? "día" : "días"}. Cuando falte poco, inicia una nueva solicitud para renovarlo.`;
}
