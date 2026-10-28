import type { Establecimiento } from "@/db/schema";
import type { Expediente } from "@/modules/expedientes/types/expediente.types";
import { inspectoresRequeridos } from "@/modules/expedientes/utils/riesgo";
import { DesignarInspectoresForm } from "@/modules/inspecciones/components/DesignarInspectoresForm";
import { InspeccionResumen } from "@/modules/inspecciones/components/InspeccionResumen";
import { ProgramarDiligenciaForm } from "@/modules/inspecciones/components/ProgramarDiligenciaForm";
import { ResultadoDiligenciaForm } from "@/modules/inspecciones/components/ResultadoDiligenciaForm";
import {
  getResumenInspeccion,
  listInspectoresElegibles,
} from "@/modules/inspecciones/services/designacion.service";
import { aInputLima, MAX_DIAS } from "@/modules/inspecciones/utils/fecha-diligencia";
import type { Usuario } from "@/modules/usuarios/types/user.types";

type Props = {
  usuario: Pick<Usuario, "id" | "rol">;
  expediente: Expediente;
  establecimiento: Establecimiento;
};

export async function PanelInspeccion({ usuario, expediente, establecimiento }: Props) {
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
  const resumenVista = (
    <InspeccionResumen
      {...resumen}
      programadaPara={expediente.diligenciaProgramadaPara}
      lugar={establecimiento.direccion}
    />
  );
  if (expediente.estado === "INSPECTOR_DESIGNADO") {
    return (
      <>
        {resumenVista}
        <ProgramarDiligenciaForm
          expedienteId={expediente.id}
          direccion={establecimiento.direccion}
          min={aInputLima(new Date())}
          max={aInputLima(new Date(new Date().getTime() + MAX_DIAS * 86_400_000))}
        />
      </>
    );
  }
  if (expediente.estado === "DILIGENCIA_PROGRAMADA") {
    return (
      <>
        {resumenVista}
        <ResultadoDiligenciaForm expedienteId={expediente.id} />
      </>
    );
  }
  return resumenVista;
}
