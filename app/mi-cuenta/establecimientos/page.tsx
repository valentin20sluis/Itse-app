import { EstablecimientosView } from "@/modules/establecimientos/components/EstablecimientosView";
import { listOwnEstablecimientos } from "@/modules/establecimientos/services/establecimiento.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export default async function EstablecimientosPage() {
  const usuario = await requireRole("cliente");
  const establecimientos = await listOwnEstablecimientos(usuario);

  return <EstablecimientosView establecimientos={establecimientos} />;
}
