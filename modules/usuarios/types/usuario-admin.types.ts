import type { UsuarioAuditoria } from "@/db/schema";
import type { Role } from "@/modules/usuarios/types/user.types";

export type UsuarioListItem = {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  rol: Role;
  activo: boolean;
  createdAt: Date;
  esActual: boolean;
};

export type AuditoriaItem = {
  id: string;
  accion: UsuarioAuditoria["accion"];
  valorAnterior: string | null;
  valorNuevo: string | null;
  actorNombre: string;
  createdAt: Date;
};

export type UsuarioDetalle = UsuarioListItem & {
  documento: string | null;
  telefono: string | null;
  expedientesPresentados: number | null;
  establecimientosRegistrados: number | null;
  auditoria: AuditoriaItem[];
};

export type UsuariosPagina = {
  items: UsuarioListItem[];
  total: number;
  pagina: number;
  totalPaginas: number;
};
