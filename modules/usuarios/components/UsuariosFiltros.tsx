import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS } from "@/modules/navigation/constants/role-labels";
import type { UsuarioFiltros } from "@/modules/usuarios/schemas/usuario-filtros.schema";
import type { Role } from "@/modules/usuarios/types/user.types";

const SELECT_CLASS =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";
const OPTION_CLASS = "bg-background text-foreground";

export function UsuariosFiltros({ filtros }: { filtros: UsuarioFiltros }) {
  const hayFiltros = Boolean(filtros.q || filtros.rol || filtros.estado);

  return (
    <form
      method="get"
      action="/panel/usuarios"
      className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]"
    >
      <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
        <Label htmlFor="filtro-q">Buscar por nombre o correo</Label>
        <Input
          id="filtro-q"
          name="q"
          type="search"
          defaultValue={filtros.q}
          maxLength={100}
          autoComplete="off"
          className="h-11"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filtro-rol">Rol</Label>
        <select id="filtro-rol" name="rol" defaultValue={filtros.rol ?? ""} className={SELECT_CLASS}>
          <option value="" className={OPTION_CLASS}>
            Todos
          </option>
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
            <option key={r} value={r} className={OPTION_CLASS}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filtro-estado">Estado</Label>
        <select
          id="filtro-estado"
          name="estado"
          defaultValue={filtros.estado ?? ""}
          className={SELECT_CLASS}
        >
          <option value="" className={OPTION_CLASS}>
            Todos
          </option>
          <option value="activo" className={OPTION_CLASS}>
            Activo
          </option>
          <option value="inactivo" className={OPTION_CLASS}>
            Inactivo
          </option>
        </select>
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
        <Button type="submit" className="h-11 px-6">
          Buscar
        </Button>
        {hayFiltros && (
          <Link
            href="/panel/usuarios"
            className={buttonVariants({ variant: "outline", className: "h-11" })}
          >
            Limpiar
          </Link>
        )}
      </div>
    </form>
  );
}
