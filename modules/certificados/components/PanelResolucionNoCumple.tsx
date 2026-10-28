import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { GenerarResolucionNoCumpleButton } from "@/modules/certificados/components/GenerarResolucionNoCumpleButton";
import { getResolucionNoCumplePdfData } from "@/modules/certificados/services/resolucion-pdf.service";
import type { EstadoExpediente } from "@/modules/expedientes/constants/estado-labels";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";
import type { Usuario } from "@/modules/usuarios/types/user.types";

type Props = {
  usuario: Pick<Usuario, "id" | "rol">;
  expedienteId: string;
  estado: EstadoExpediente;
};

export async function PanelResolucionNoCumple({ usuario, expedienteId, estado }: Props) {
  if (usuario.rol === "cliente") return null;

  let contenido: ReactNode;
  if (estado === "NO_CUMPLE") {
    contenido =
      usuario.rol === "superadmin" ? (
        <GenerarResolucionNoCumpleButton expedienteId={expedienteId} />
      ) : (
        <p className="text-sm text-muted-foreground">Esperando resolución de Jefatura.</p>
      );
  } else if (estado === "FINALIZADO" || estado === "ENTREGADO") {
    const data = await getResolucionNoCumplePdfData(usuario, expedienteId);
    if (!data) return null;
    contenido = (
      <>
        <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
          <dt className="font-medium">Número</dt>
          <dd>{data.resolucionNumero}</dd>
          <dt className="font-medium">Fecha</dt>
          <dd>{formatFecha(data.resolucionAt)}</dd>
        </dl>
        <p className="text-sm text-muted-foreground">
          {estado === "FINALIZADO"
            ? "Resolución de no cumple generada. Falta enviarla al cliente."
            : "Enviada al cliente."}
        </p>
        <a
          href={`/api/expedientes/${expedienteId}/resolucion`}
          aria-label={`Descargar resolución de no cumple N.° ${data.resolucionNumero}`}
          className={buttonVariants({ variant: "outline", className: "inline-flex min-h-11 w-fit" })}
        >
          Descargar resolución
        </a>
      </>
    );
  } else {
    return null;
  }

  return (
    <section aria-labelledby="resolucion-no-cumple-titulo" className="space-y-3">
      <h3 id="resolucion-no-cumple-titulo" className="font-medium">
        Resolución de no cumple
      </h3>
      {contenido}
    </section>
  );
}
