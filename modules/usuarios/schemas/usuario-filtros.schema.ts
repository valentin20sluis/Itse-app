import { z } from "zod";
import { roleSchema } from "@/modules/usuarios/schemas/role.schema";

export const usuarioFiltrosSchema = z.object({
  q: z
    .string()
    .transform((s) => s.trim().slice(0, 100))
    .catch(""),
  rol: roleSchema.optional().catch(undefined),
  estado: z.enum(["activo", "inactivo"]).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).catch(1),
});

export type UsuarioFiltros = z.infer<typeof usuarioFiltrosSchema>;

type SearchParams = Record<string, string | string[] | undefined>;

export function parseUsuarioFiltros(params: SearchParams): UsuarioFiltros {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return usuarioFiltrosSchema.parse({
    q: first(params.q),
    rol: first(params.rol),
    estado: first(params.estado),
    pagina: first(params.pagina),
  });
}
