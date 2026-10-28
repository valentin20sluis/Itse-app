import { CertificadosPanelView } from "@/modules/certificados/components/CertificadosPanelView";
import { filtroCertificadosSchema } from "@/modules/certificados/schemas/filtro-certificados.schema";
import { listCertificadosPanel } from "@/modules/certificados/services/certificado-lista.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export const metadata = { title: "Certificados" };

export default async function CertificadosPanelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await requireRole("admin", "superadmin");
  const { filtro } = filtroCertificadosSchema.parse(await searchParams);
  const filas = await listCertificadosPanel(usuario, filtro);

  return <CertificadosPanelView filas={filas} filtro={filtro} />;
}
