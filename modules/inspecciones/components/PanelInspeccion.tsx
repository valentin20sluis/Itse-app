import { buttonVariants } from "@/components/ui/button";
import type { Establecimiento } from "@/db/schema";
import type { EstadoExpediente } from "@/modules/expedientes/constants/estado-labels";
import type { Expediente } from "@/modules/expedientes/types/expediente.types";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";
import { inspectoresRequeridos, tipoItsePorRiesgo } from "@/modules/expedientes/utils/riesgo";
import { DesignarInspectoresForm } from "@/modules/inspecciones/components/DesignarInspectoresForm";
import { EvaluarSubsanacionForm } from "@/modules/inspecciones/components/EvaluarSubsanacionForm";
import { InspeccionResumen } from "@/modules/inspecciones/components/InspeccionResumen";
import { ObservacionesLista } from "@/modules/inspecciones/components/ObservacionesLista";
import { PlazoSubsanacion } from "@/modules/inspecciones/components/PlazoSubsanacion";
import { ProgramarDiligenciaForm } from "@/modules/inspecciones/components/ProgramarDiligenciaForm";
import { ResultadoDiligenciaForm } from "@/modules/inspecciones/components/ResultadoDiligenciaForm";
import {
  getResumenInspeccion,
  listInspectoresElegibles,
} from "@/modules/inspecciones/services/designacion.service";
import { getResumenSubsanacion } from "@/modules/inspecciones/services/diligencia.service";
import { estadoPlazo } from "@/modules/inspecciones/utils/dias-habiles";
import { aInputLima, MAX_DIAS } from "@/modules/inspecciones/utils/fecha-diligencia";
import { calcularLimiteSubsanacion } from "@/modules/inspecciones/utils/plazo-subsanacion";
import { opcionesEvaluacion } from "@/modules/inspecciones/utils/subsanacion";
import type { Usuario } from "@/modules/usuarios/types/user.types";

type Props = {
  usuario: Pick<Usuario, "id" | "rol">;
  expediente: Expediente;
  establecimiento: Establecimiento;
};

const ESTADOS_CON_OBSERVACIONES: EstadoExpediente[] = ["EN_SUBSANACION", "CUMPLE", "NO_CUMPLE"];

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
  const puedeDescargar =
    resumen.total > 0 &&
    expediente.estado !== "ANULADO" &&
    (usuario.rol === "admin" || usuario.rol === "superadmin");
  const resumenVista = (
    <>
      <InspeccionResumen
        {...resumen}
        programadaPara={expediente.diligenciaProgramadaPara}
        lugar={establecimiento.direccion}
      />
      {puedeDescargar ? (
        <a
          href={`/api/expedientes/${expediente.id}/constancia`}
          aria-label={`Descargar constancia de designación del expediente ${expediente.numero ?? ""}`.trim()}
          className={buttonVariants({ variant: "outline", className: "inline-flex min-h-11 w-fit" })}
        >
          Descargar constancia
        </a>
      ) : null}
    </>
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
    const ahora = new Date();
    return (
      <>
        {resumenVista}
        <ResultadoDiligenciaForm
          expedienteId={expediente.id}
          tipoItse={expediente.nivelRiesgo ? tipoItsePorRiesgo(expediente.nivelRiesgo) : null}
          min={aInputLima(ahora)}
          max={aInputLima(calcularLimiteSubsanacion("PREVIA", ahora))}
        />
      </>
    );
  }
  if (ESTADOS_CON_OBSERVACIONES.includes(expediente.estado)) {
    const subsanacion = await getResumenSubsanacion(usuario, expediente.id);
    return (
      <>
        {resumenVista}
        <ObservacionesLista observaciones={subsanacion.observaciones} />
        {expediente.estado === "EN_SUBSANACION" && subsanacion.limite && subsanacion.tipoItse && (
          <>
            <PlazoSubsanacion limite={subsanacion.limite} />
            <p className="text-sm">
              {subsanacion.tipoItse === "PREVIA"
                ? "Los inspectores vuelven en la fecha reprogramada: el solicitante no sube archivos."
                : expediente.subsanacionPresentadaAt
                  ? `Evidencia presentada el ${formatFecha(expediente.subsanacionPresentadaAt)}.`
                  : "Evidencia aún no presentada."}
            </p>
            <EvaluarSubsanacionForm
              expedienteId={expediente.id}
              opciones={opcionesEvaluacion({
                tipoItse: subsanacion.tipoItse,
                presentada: expediente.subsanacionPresentadaAt !== null,
                vencido: estadoPlazo(subsanacion.limite, new Date()).vencido,
              })}
            />
          </>
        )}
      </>
    );
  }
  return resumenVista;
}
