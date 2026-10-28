import type { LucideIcon } from "lucide-react";
import type { Role } from "@/modules/usuarios/types/user.types";

export type NavArea = "cliente" | "panel";

export type NavItem = {
  label: string;
  /** Texto breve para la barra inferior del celular (6 ítems en 360 px); el nombre completo va en aria-label. */
  labelCorto?: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
  section: "main" | "jefatura";
  area: NavArea;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};
