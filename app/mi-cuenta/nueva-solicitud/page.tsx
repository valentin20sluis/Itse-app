import { Building2 } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { listOwnEstablecimientos } from "@/modules/establecimientos/services/establecimiento.service";
import { SolicitudWizard } from "@/modules/expedientes/components/SolicitudWizard";
import { listDocumentos } from "@/modules/expedientes/services/documento.service";
import {
  getExpedienteById,
  listEstablecimientosOcupados,
} from "@/modules/expedientes/services/expediente.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NuevaSolicitudPage({
  searchParams,
}: {
  searchParams: Promise<{ borrador?: string | string[] }>;
}) {
  const usuario = await requireRole("cliente");
  const establecimientos = await listOwnEstablecimientos(usuario);

  if (establecimientos.length === 0) {
    return (
      <>
        <PageHeader title="Nueva solicitud" />
        <EmptyState
          icon={<Building2 />}
          title="Aún no tienes establecimientos"
          description="Registra un establecimiento para poder iniciar tu solicitud de inspección."
          action={
            <Link href="/mi-cuenta/establecimientos" className={buttonVariants()}>
              Ir a mis establecimientos
            </Link>
          }
        />
      </>
    );
  }

  const { borrador: id } = await searchParams;
  const found = typeof id === "string" && UUID.test(id) ? await getExpedienteById(usuario, id) : null;
  const borrador = found?.estado === "BORRADOR" ? found : null;
  const documentos = borrador ? await listDocumentos(usuario, borrador.id) : [];
  const ocupados = await listEstablecimientosOcupados(usuario, borrador?.id);

  return (
    <>
      <PageHeader title="Nueva solicitud" />
      <SolicitudWizard
        establecimientos={establecimientos}
        borrador={borrador}
        documentos={documentos}
        establecimientosOcupados={ocupados}
        defaultsSolicitante={{
          nombre: `${usuario.nombres} ${usuario.apellidos}`.trim(),
          documento: usuario.documento ?? "",
          telefono: usuario.telefono ?? "",
          email: usuario.email,
        }}
      />
    </>
  );
}
