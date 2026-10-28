import { buttonVariants } from "@/components/ui/button";

export function VerBorradorCertificado({ expedienteId, numero }: { expedienteId: string; numero: string }) {
  return (
    <a
      href={`/api/expedientes/${expedienteId}/certificado`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Ver certificado N.° ${numero} (borrador), se abre en una pestaña nueva`}
      className={buttonVariants({ className: "inline-flex min-h-11 w-fit" })}
    >
      Ver certificado (borrador)
    </a>
  );
}
