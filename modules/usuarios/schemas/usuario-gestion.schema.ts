import { z } from "zod";
import { roleSchema } from "@/modules/usuarios/schemas/role.schema";

export const cambiarRolSchema = z.object({ id: z.uuid(), rol: roleSchema });
export const cambiarEstadoSchema = z.object({ id: z.uuid(), activo: z.boolean() });
