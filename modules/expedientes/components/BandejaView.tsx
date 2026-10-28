import Link from "next/link";
import { Inbox, SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EstadoBadge } from "@/modules/expedientes/components/EstadoBadge";
import { ESTADO_LABELS } from "@/modules/expedientes/constants/estado-labels";
import { RIESGO_LABELS, TIPO_TRAMITE_LABELS } from "@/modules/expedientes/constants/expediente-labels";
import type { FiltrosBandeja } from "@/modules/expedientes/schemas/filtros-bandeja.schema";
import type { BandejaResultado, ExpedientePanelItem } from "@/modules/expedientes/types/bandeja.types";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";

const BASE = "/panel/expedientes";
const ESTADOS_OBSOLETOS = ["BORRADOR", "EN_TRAMITE_EXTERNO", "PENDIENTE_RESOLUCION", "DERIVADO_COMERCIALIZACION"];
const ESTADOS = Object.keys(ESTADO_LABELS).filter(
  (e) => !ESTADOS_OBSOLETOS.includes(e),
) as (keyof typeof ESTADO_LABELS)[];

type Props = { resultado: BandejaResultado; filtros: FiltrosBandeja };

function href(filtros: FiltrosBandeja, page: number) {
  const params = new URLSearchParams();
  if (filtros.pendientes) params.set("pendientes", filtros.pendientes);
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.q) params.set("q", filtros.q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${BASE}?${qs}` : BASE;
}

function verLink(e: ExpedientePanelItem) {
  return (
    <Link
      href={`${BASE}/${e.id}`}
      className={buttonVariants({ variant: "outline", className: "h-11" })}
      aria-label={`Ver expediente ${e.numero}`}
    >
      Ver
    </Link>
  );
}

const riesgo = (e: ExpedientePanelItem) => (e.nivelRiesgo ? RIESGO_LABELS[e.nivelRiesgo] : "—");
const presentado = (e: ExpedientePanelItem) => (e.presentadoAt ? formatFecha(e.presentadoAt) : "—");

function Filtros({ filtros }: { filtros: FiltrosBandeja }) {
  const hayFiltros = Boolean(filtros.estado || filtros.q || filtros.pendientes);
  return (
    <form method="get" action={BASE} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Label htmlFor="q">Buscar por número</Label>
        <Input id="q" name="q" defaultValue={filtros.q ?? ""} maxLength={30} className="h-11" />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 sm:w-64">
        <Label htmlFor="estado">Estado</Label>
        <select
          id="estado"
          name="estado"
          defaultValue={filtros.estado ?? ""}
          className="h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        >
          <option value="">Todos</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {ESTADO_LABELS[e].label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" className={buttonVariants({ className: "h-11" })}>
          Filtrar
        </button>
        {hayFiltros && (
          <Link href={BASE} className={buttonVariants({ variant: "outline", className: "h-11" })}>
            Limpiar
          </Link>
        )}
      </div>
    </form>
  );
}

function Paginacion({ resultado, filtros }: Props) {
  const { page, pageSize, total } = resultado;
  const paginas = Math.max(1, Math.ceil(total / pageSize));
  const enlace = "h-11";
  const deshabilitado = "inline-flex h-11 items-center px-3 text-sm text-muted-foreground";
  return (
    <nav aria-label="Paginación" className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Página {page} de {paginas} · {total} {total === 1 ? "resultado" : "resultados"}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(filtros, page - 1)} className={buttonVariants({ variant: "outline", className: enlace })}>
            Anterior
          </Link>
        ) : (
          <span className={deshabilitado}>Anterior</span>
        )}
        {page < paginas ? (
          <Link href={href(filtros, page + 1)} className={buttonVariants({ variant: "outline", className: enlace })}>
            Siguiente
          </Link>
        ) : (
          <span className={deshabilitado}>Siguiente</span>
        )}
      </div>
    </nav>
  );
}

export function BandejaView({ resultado, filtros }: Props) {
  const { items } = resultado;
  const hayFiltros = Boolean(filtros.estado || filtros.q || filtros.pendientes);

  return (
    <div className="min-w-0">
      <PageHeader title="Expedientes" description="Expedientes presentados por los administrados." />
      <Filtros filtros={filtros} />
      <Link
        href={`${BASE}?pendientes=jefatura`}
        className={buttonVariants({ variant: "outline", className: "-mt-2 mb-6 h-11" })}
      >
        Pendientes de Jefatura
      </Link>

      {items.length === 0 ? (
        hayFiltros ? (
          <EmptyState
            icon={<SearchX />}
            title="Sin coincidencias"
            description="Ningún expediente coincide con los filtros. Prueba con otros valores."
            action={
              <Link href={BASE} className={buttonVariants({ variant: "outline", className: "h-11" })}>
                Limpiar filtros
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={<Inbox />}
            title="Aún no hay expedientes"
            description="Cuando un administrado presente una solicitud, aparecerá aquí."
          />
        )
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableCaption className="sr-only">Expedientes presentados</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Número</TableHead>
                  <TableHead scope="col">Establecimiento</TableHead>
                  <TableHead scope="col">Cliente</TableHead>
                  <TableHead scope="col">Trámite</TableHead>
                  <TableHead scope="col">Nivel de riesgo</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                  <TableHead scope="col">Presentado</TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-normal break-words font-medium">{e.numero}</TableCell>
                    <TableCell className="whitespace-normal break-words">{e.establecimientoNombre}</TableCell>
                    <TableCell className="whitespace-normal break-words">{e.clienteNombre}</TableCell>
                    <TableCell className="whitespace-normal">{TIPO_TRAMITE_LABELS[e.tipoTramite]}</TableCell>
                    <TableCell className="whitespace-normal">{riesgo(e)}</TableCell>
                    <TableCell className="whitespace-normal">
                      <EstadoBadge estado={e.estado} noCumple={e.noCumple} />
                    </TableCell>
                    <TableCell className="whitespace-normal">{presentado(e)}</TableCell>
                    <TableCell className="whitespace-normal text-right">{verLink(e)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 gap-4 md:hidden">
            {items.map((e) => (
              <Card key={e.id}>
                <CardHeader>
                  <CardTitle className="break-words">{e.numero}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Establecimiento</dt>
                    <dd className="min-w-0 break-words">{e.establecimientoNombre}</dd>
                    <dt className="text-muted-foreground">Cliente</dt>
                    <dd className="min-w-0 break-words">{e.clienteNombre}</dd>
                    <dt className="text-muted-foreground">Trámite</dt>
                    <dd>{TIPO_TRAMITE_LABELS[e.tipoTramite]}</dd>
                    <dt className="text-muted-foreground">Nivel de riesgo</dt>
                    <dd>{riesgo(e)}</dd>
                    <dt className="text-muted-foreground">Estado</dt>
                    <dd>
                      <EstadoBadge estado={e.estado} noCumple={e.noCumple} />
                    </dd>
                    <dt className="text-muted-foreground">Presentado</dt>
                    <dd>{presentado(e)}</dd>
                  </dl>
                  {verLink(e)}
                </CardContent>
              </Card>
            ))}
          </div>

          <Paginacion resultado={resultado} filtros={filtros} />
        </>
      )}
    </div>
  );
}
