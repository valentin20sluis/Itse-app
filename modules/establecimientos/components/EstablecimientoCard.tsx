import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";

type Props = {
  establecimiento: Establecimiento;
  onEdit: () => void;
  onArchive: () => void;
};

export function EstablecimientoCard({ establecimiento: e, onEdit, onArchive }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="break-words">{e.nombreComercial}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Dirección</dt>
          <dd className="break-words">{e.direccion}</dd>
          <dt className="text-muted-foreground">Distrito</dt>
          <dd className="break-words">{e.distrito}</dd>
          <dt className="text-muted-foreground">Giro</dt>
          <dd className="break-words">{e.giro}</dd>
          <dt className="text-muted-foreground">Área</dt>
          <dd>{Number(e.areaM2)} m²</dd>
          <dt className="text-muted-foreground">Pisos</dt>
          <dd>{e.numeroPisos}</dd>
        </dl>
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          className="h-11 flex-1"
          onClick={onEdit}
          aria-label={`Editar ${e.nombreComercial}`}
        >
          Editar
        </Button>
        <Button
          variant="destructive"
          className="h-11 flex-1"
          onClick={onArchive}
          aria-label={`Archivar ${e.nombreComercial}`}
        >
          Archivar
        </Button>
      </CardFooter>
    </Card>
  );
}
