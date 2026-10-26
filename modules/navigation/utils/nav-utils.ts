import { JEFATURA_TITLE, NAV_ITEMS } from "../constants/nav-items";
import type { NavArea, NavItem, NavSection } from "../types/nav.types";
import type { Role } from "@/modules/usuarios/types/user.types";

const ROOTS = ["/mi-cuenta", "/panel"];

export function getNavSections(area: NavArea, role: Role): NavSection[] {
  const visible = NAV_ITEMS.filter((i) => i.area === area && i.roles.includes(role));
  const main = visible.filter((i) => i.section === "main");
  const jefatura = visible.filter((i) => i.section === "jefatura");
  const sections: NavSection[] = [];
  if (main.length) sections.push({ items: main });
  if (jefatura.length) sections.push({ title: JEFATURA_TITLE, items: jefatura });
  return sections;
}

export function findNavItem(area: NavArea, href: string): NavItem | undefined {
  return NAV_ITEMS.find((i) => i.area === area && i.href === href);
}

export function isActivePath(pathname: string, href: string): boolean {
  if (ROOTS.includes(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
