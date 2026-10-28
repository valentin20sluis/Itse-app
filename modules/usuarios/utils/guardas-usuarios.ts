import type { Role } from "@/modules/usuarios/types/user.types";

export type Guarda = { ok: true } | { ok: false; error: string };

type Destino = { id: string; rol: Role; activo: boolean };

export const ERROR_PROPIA_CUENTA = "No puedes modificar tu propia cuenta.";
export const ERROR_ULTIMO_JEFE = "Debe quedar al menos un jefe activo.";

// Un superadmin inactivo no cuenta: quitarle el rol o desactivarlo no reduce los jefes activos.
function dejariaSinJefe(destino: Destino, superadminsActivos: number): boolean {
  return destino.rol === "superadmin" && destino.activo && superadminsActivos <= 1;
}

export function evaluarCambioRol(p: {
  actorId: string;
  destino: Destino;
  nuevoRol: Role;
  superadminsActivos: number;
}): Guarda {
  if (p.destino.id === p.actorId) return { ok: false, error: ERROR_PROPIA_CUENTA };
  if (p.destino.rol === p.nuevoRol) return { ok: false, error: "Ya tiene ese rol." };
  if (dejariaSinJefe(p.destino, p.superadminsActivos)) {
    return { ok: false, error: ERROR_ULTIMO_JEFE };
  }
  return { ok: true };
}

export function evaluarCambioEstado(p: {
  actorId: string;
  destino: Destino;
  nuevoActivo: boolean;
  superadminsActivos: number;
}): Guarda {
  if (p.destino.id === p.actorId) return { ok: false, error: ERROR_PROPIA_CUENTA };
  if (p.destino.activo === p.nuevoActivo) {
    return { ok: false, error: p.nuevoActivo ? "Ya está activo." : "Ya está inactivo." };
  }
  if (!p.nuevoActivo && dejariaSinJefe(p.destino, p.superadminsActivos)) {
    return { ok: false, error: ERROR_ULTIMO_JEFE };
  }
  return { ok: true };
}
