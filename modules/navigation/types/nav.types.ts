import type { LucideIcon } from "lucide-react";
import type { Role } from "@/modules/usuarios/types/user.types";

export type NavArea = "cliente" | "panel";

export type NavItem = {
  label: string;
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
