import { BandejaView } from "@/modules/expedientes/components/BandejaView";
import { filtrosBandejaSchema } from "@/modules/expedientes/schemas/filtros-bandeja.schema";
import { listExpedientesPanel } from "@/modules/expedientes/services/bandeja.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export const metadata = { title: "Expedientes" };

export default async function BandejaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await requireRole("admin", "superadmin");
  const filtros = filtrosBandejaSchema.parse(await searchParams);
  const resultado = await listExpedientesPanel(usuario, filtros);

  return <BandejaView resultado={resultado} filtros={filtros} />;
}
