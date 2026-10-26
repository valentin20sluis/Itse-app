import { PanelShell } from "@/modules/panel/components/PanelShell";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  const usuario = await requireRole("admin", "superadmin");
  const name = `${usuario.nombres} ${usuario.apellidos}`.trim() || usuario.email;
  return (
    <PanelShell name={name} role={usuario.rol}>
      {children}
    </PanelShell>
  );
}
