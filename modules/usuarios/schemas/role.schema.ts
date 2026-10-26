import { z } from "zod";
import { rolEnum } from "@/db/schema";
import type { Role } from "@/modules/usuarios/types/user.types";

export const roleSchema = z.enum(rolEnum.enumValues);

export function parseRole(value: unknown): Role {
  const result = roleSchema.safeParse(value);
  return result.success ? result.data : "cliente";
}
