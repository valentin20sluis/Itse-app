import { ClientShell } from "@/modules/client-area/components/ClientShell";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export default async function MiCuentaLayout({
  children,
}: LayoutProps<"/mi-cuenta">) {
  const usuario = await requireRole("cliente");
  const name = `${usuario.nombres} ${usuario.apellidos}`.trim() || usuario.email;
  return <ClientShell name={name}>{children}</ClientShell>;
}
