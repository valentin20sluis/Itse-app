import type { CertificadoClienteFila } from "@/modules/certificados/services/certificado-lista.service";
import type { InicioCliente } from "@/modules/client-area/types/inicio.types";
import type { Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";
import { ESTADOS_QUE_LIBERAN_ESTABLECIMIENTO } from "@/modules/expedientes/services/expediente.service";
import type { ExpedienteListItem } from "@/modules/expedientes/types/expediente.types";

type Entrada = {
  establecimientos: Pick<Establecimiento, "id" | "nombreComercial">[];
  expedientes: Pick<ExpedienteListItem, "establecimientoId" | "estado" | "numero">[];
  certificados: CertificadoClienteFila[];
};

export type ResumenInicio = Omit<InicioCliente, "pasos">;

export function resumirInicio({ establecimientos, expedientes, certificados }: Entrada): ResumenInicio {
  const ocupantes = new Map<string, string>();
  for (const e of expedientes) {
    if (!ESTADOS_QUE_LIBERAN_ESTABLECIMIENTO.includes(e.estado)) {
      ocupantes.set(e.establecimientoId, e.numero ?? "Borrador");
    }
  }
  const lista = establecimientos.map((est) => {
    const ocupante = ocupantes.get(est.id);
    return { id: est.id, nombre: est.nombreComercial, libre: ocupante === undefined, detalle: ocupante ?? "Disponible" };
  });
  const libres = lista.filter((e) => e.libre).length;

  const cuenta = (estado: CertificadoClienteFila["estado"]) => certificados.filter((c) => c.estado === estado).length;
  const avisos = certificados
    .filter((c) => c.estado === "POR_VENCER" || c.estado === "VENCIDO")
    .sort((a, b) => a.venceAt.getTime() - b.venceAt.getTime());

  return {
    expedientes: {
      total: expedientes.length,
      enCurso: expedientes.filter((e) => e.estado !== "ANULADO" && e.estado !== "ENTREGADO").length,
      finalizados: expedientes.filter((e) => e.estado === "ENTREGADO").length,
    },
    establecimientos: { total: lista.length, conSolicitud: lista.length - libres, libres, lista },
    certificados: {
      total: certificados.length,
      vigentes: cuenta("VIGENTE"),
      porVencer: cuenta("POR_VENCER"),
      vencidos: cuenta("VENCIDO"),
      avisos,
    },
    puedeSolicitar: libres >= 1,
  };
}

export function nombreSaludo({ nombres, email }: { nombres: string; email: string }): string {
  return nombres.trim() || email;
}
