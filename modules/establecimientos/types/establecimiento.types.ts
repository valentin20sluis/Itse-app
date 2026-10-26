import type { Establecimiento } from "@/db/schema";
import type { Usuario } from "@/modules/usuarios/types/user.types";

export type { Establecimiento };
export type Actor = Pick<Usuario, "id" | "rol">;
