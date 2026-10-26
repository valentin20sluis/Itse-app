import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ROLE_LABELS } from "@/modules/navigation/constants/role-labels";
import { UserSummary } from "@/modules/navigation/components/UserSummary";
import type { Role } from "@/modules/usuarios/types/user.types";
import { PanelSidebar } from "./PanelSidebar";

type PanelShellProps = {
  name: string;
  role: Role;
  children: ReactNode;
};

export function PanelShell({ name, role, children }: PanelShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <PanelSidebar role={role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-border bg-background px-3 md:px-4">
            <SidebarTrigger aria-label="Abrir o cerrar el menú" />
            <UserSummary name={name} roleLabel={ROLE_LABELS[role]} />
          </header>
          <SidebarInset className="min-w-0 p-3 md:p-4">{children}</SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
