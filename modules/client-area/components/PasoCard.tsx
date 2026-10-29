import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { PasoSiguiente } from "@/modules/client-area/types/inicio.types";
import { EstadoBadge } from "@/modules/expedientes/components/EstadoBadge";

export function PasoCard({ paso }: { paso: PasoSiguiente }) {
  const requiereAccion = paso.urgencia === 0;

  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <h3 className="break-words font-heading text-base font-medium leading-snug">
          {paso.establecimientoNombre}
        </h3>
        {paso.numero && <p className="break-words text-xs text-muted-foreground">{paso.numero}</p>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge estado={paso.estado} noCumple={paso.noCumple} />
          {requiereAccion && <Badge variant="outline">Requiere tu atención</Badge>}
        </div>
        <p className="break-words">{paso.mensaje}</p>
        {paso.motivo && (
          <p className="line-clamp-3 break-words text-muted-foreground">Motivo: {paso.motivo}</p>
        )}
      </CardContent>
      <CardFooter>
        <Link
          href={paso.accion.href}
          aria-label={paso.accion.ariaLabel}
          className={buttonVariants({
            variant: requiereAccion ? "default" : "outline",
            className: requiereAccion
              ? "min-h-11 w-full whitespace-normal sm:w-fit"
              : "min-h-11 w-full whitespace-normal border-foreground/30 sm:w-fit",
          })}
        >
          {paso.accion.label}
        </Link>
      </CardFooter>
    </Card>
  );
}
