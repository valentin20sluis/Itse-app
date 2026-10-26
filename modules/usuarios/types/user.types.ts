import type { rolEnum, Usuario } from "@/db/schema";

export type Role = (typeof rolEnum.enumValues)[number];
export type { Usuario };
