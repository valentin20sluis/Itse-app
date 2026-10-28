import type { Establecimiento } from "@/db/schema";
import type { Expediente } from "@/modules/expedientes/types/expediente.types";
import { inspectoresRequeridos } from "@/modules/expedientes/utils/riesgo";
import { DesignarInspectoresForm } from "@/modules/inspecciones/components/DesignarInspectoresForm";
import { InspeccionResumen } from "@/modules/inspecciones/components/InspeccionResumen";
import {
  getResumenInspeccion,
  listInspectoresElegibles,
} from "@/modules/inspecciones/services/designacion.service";
import type { Usuario } from "@/modules/usuarios/types/user.types";

type Props = {
  usuario: Pick<Usuario, "id" | "rol">;
  expediente: Expediente;
  // Lugar de la diligencia; lo usará `diligencia-inspeccion` sin volver a tocar la página.
  establecimiento: Establecimiento;
};

export async function PanelInspeccion({ usuario, expediente }: Props) {
  if (expediente.estado === "APROBADO_JEFATURA") {
    if (!expediente.nivelRiesgo) return null;
    const candidatos = await listInspectoresElegibles(usuario);
    return (
      <DesignarInspectoresForm
        expedienteId={expediente.id}
        requeridos={inspectoresRequeridos(expediente.nivelRiesgo)}
        candidatos={candidatos}
      />
    );
  }
  const resumen = await getResumenInspeccion(usuario, expediente.id);
  return <InspeccionResumen {...resumen} />;
}
