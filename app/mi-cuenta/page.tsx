import { InicioClienteView } from "@/modules/client-area/components/InicioClienteView";
import { getInicioCliente } from "@/modules/client-area/services/inicio.service";
import { nombreSaludo } from "@/modules/client-area/utils/resumen-inicio";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export default async function MiCuentaPage() {
  const usuario = await requireRole("cliente");
  const inicio = await getInicioCliente(usuario);

  return <InicioClienteView inicio={inicio} saludo={nombreSaludo(usuario)} />;
}
