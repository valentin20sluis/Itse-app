import { notFound } from "next/navigation";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { findNavItem } from "@/modules/navigation/utils/nav-utils";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export default async function MiCuentaSectionPage({ params }: PageProps<"/mi-cuenta/[section]">) {
  const { section } = await params;
  const item = findNavItem("cliente", `/mi-cuenta/${section}`);
  if (!item) notFound();
  await requireRole(...item.roles);
  const Icon = item.icon;

  return (
    <>
      <PageHeader title={item.label} />
      <EmptyState
        icon={<Icon />}
        title="Próximamente"
        description="Esta sección estará disponible en una próxima versión."
      />
    </>
  );
}
