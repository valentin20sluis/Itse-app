import { buttonVariants } from "@/components/ui/button";

const clase = buttonVariants({ variant: "outline", className: "inline-flex min-h-11 w-fit" });

export function DescargasCertificado({ expedienteId, numero }: { expedienteId: string; numero: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`/api/expedientes/${expedienteId}/certificado`}
        aria-label={`Descargar certificado N.° ${numero}`}
        className={clase}
      >
        Descargar certificado
      </a>
      <a
        href={`/api/expedientes/${expedienteId}/resolucion`}
        aria-label={`Descargar resolución del certificado N.° ${numero}`}
        className={clase}
      >
        Descargar resolución
      </a>
    </div>
  );
}
