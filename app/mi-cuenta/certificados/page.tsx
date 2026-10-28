import { CertificadosClienteView } from "@/modules/certificados/components/CertificadosClienteView";
import { listCertificadosCliente } from "@/modules/certificados/services/certificado-lista.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export const metadata = { title: "Mis certificados" };

export default async function MisCertificadosPage() {
  const usuario = await requireRole("cliente");
  const filas = await listCertificadosCliente(usuario);

  return <CertificadosClienteView filas={filas} />;
}
