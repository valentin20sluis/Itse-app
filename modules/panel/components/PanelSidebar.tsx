"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/shared/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { getNavSections, isActivePath } from "@/modules/navigation/utils/nav-utils";
import type { Role } from "@/modules/usuarios/types/user.types";

export function PanelSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const sections = getNavSections("panel", role);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
        <Link href="/panel" aria-label="SIGITSE, ir al dashboard" className="overflow-hidden">
          <Logo className="[&>span:last-child]:group-data-[collapsible=icon]:hidden" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {sections.map((section, i) => (
          <div key={section.title ?? "main"}>
            {i > 0 && <SidebarSeparator />}
            <SidebarGroup>
              {section.title && <SidebarGroupLabel>{section.title}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActivePath(pathname, item.href)}
                        tooltip={item.label}
                        render={
                          <Link
                            href={item.href}
                            aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                            onClick={() => setOpenMobile(false)}
                          />
                        }
                      >
                        <item.icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
