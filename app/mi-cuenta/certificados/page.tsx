import { CertificadosClienteView } from "@/modules/certificados/components/CertificadosClienteView";
import {
  listCertificadosCliente,
  listResolucionesNoCumpleCliente,
} from "@/modules/certificados/services/certificado-lista.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export const metadata = { title: "Mis certificados" };

export default async function MisCertificadosPage() {
  const usuario = await requireRole("cliente");
  const [filas, resoluciones] = await Promise.all([
    listCertificadosCliente(usuario),
    listResolucionesNoCumpleCliente(usuario),
  ]);

  return <CertificadosClienteView filas={filas} resoluciones={resoluciones} />;
}
