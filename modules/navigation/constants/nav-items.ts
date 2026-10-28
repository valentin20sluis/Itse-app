import {
  Award,
  BarChart3,
  Building2,
  ClipboardCheck,
  FilePlus2,
  FolderOpen,
  LayoutDashboard,
  Home,
  Search,
  Settings,
  UserCircle,
  Users,
} from "lucide-react";
import type { NavItem } from "../types/nav.types";

const cliente = ["cliente"] as const;
const gestion = ["admin", "superadmin"] as const;
const jefatura = ["superadmin"] as const;

export const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", href: "/mi-cuenta", icon: Home, roles: [...cliente], section: "main", area: "cliente" },
  { label: "Mis establecimientos", href: "/mi-cuenta/establecimientos", icon: Building2, roles: [...cliente], section: "main", area: "cliente" },
  { label: "Nueva solicitud", href: "/mi-cuenta/nueva-solicitud", icon: FilePlus2, roles: [...cliente], section: "main", area: "cliente" },
  { label: "Mis expedientes", href: "/mi-cuenta/expedientes", icon: FolderOpen, roles: [...cliente], section: "main", area: "cliente" },
  { label: "Mis certificados", href: "/mi-cuenta/certificados", icon: Award, roles: [...cliente], section: "main", area: "cliente" },
  { label: "Mi perfil", href: "/mi-cuenta/perfil", icon: UserCircle, roles: [...cliente], section: "main", area: "cliente" },

  { label: "Dashboard", href: "/panel", icon: LayoutDashboard, roles: [...gestion], section: "main", area: "panel" },
  { label: "Expedientes", href: "/panel/expedientes", icon: FolderOpen, roles: [...gestion], section: "main", area: "panel" },
  { label: "Inspectores", href: "/panel/inspectores", icon: Search, roles: [...gestion], section: "main", area: "panel" },
  { label: "Certificados", href: "/panel/certificados", icon: Award, roles: [...gestion], section: "main", area: "panel" },
  { label: "Reportes", href: "/panel/reportes", icon: BarChart3, roles: [...gestion], section: "main", area: "panel" },

  { label: "Por aprobar", href: "/panel/expedientes?estado=ENVIADO_JEFATURA", icon: ClipboardCheck, roles: [...jefatura], section: "jefatura", area: "panel" },
  { label: "Usuarios", href: "/panel/usuarios", icon: Users, roles: [...jefatura], section: "jefatura", area: "panel" },
  { label: "Configuración", href: "/panel/configuracion", icon: Settings, roles: [...jefatura], section: "jefatura", area: "panel" },
];

export const JEFATURA_TITLE = "Jefatura";
