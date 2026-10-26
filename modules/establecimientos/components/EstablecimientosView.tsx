"use client";

import { useState } from "react";
import { Building2, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { ArchiveEstablecimientoDialog } from "@/modules/establecimientos/components/ArchiveEstablecimientoDialog";
import { EstablecimientoCard } from "@/modules/establecimientos/components/EstablecimientoCard";
import { EstablecimientoForm } from "@/modules/establecimientos/components/EstablecimientoForm";
import type { Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";

type FormTarget = { establecimiento?: Establecimiento } | null;

export function EstablecimientosView({
  establecimientos,
}: {
  establecimientos: Establecimiento[];
}) {
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [archiveTarget, setArchiveTarget] = useState<Establecimiento | null>(null);

  const newButton = (
    <Button className="h-11" onClick={() => setFormTarget({})}>
      <Plus data-icon="inline-start" />
      Nuevo establecimiento
    </Button>
  );

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Mis establecimientos"
          description="Registra los locales donde solicitarás la inspección técnica de seguridad."
        />
        {establecimientos.length > 0 && <div className="mb-6 sm:shrink-0">{newButton}</div>}
      </div>

      {establecimientos.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="Aún no tienes establecimientos"
          description="Registra tu primer establecimiento para poder iniciar un trámite."
          action={newButton}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {establecimientos.map((e) => (
            <EstablecimientoCard
              key={e.id}
              establecimiento={e}
              onEdit={() => setFormTarget({ establecimiento: e })}
              onArchive={() => setArchiveTarget(e)}
            />
          ))}
        </div>
      )}

      <EstablecimientoForm
        open={formTarget !== null}
        onOpenChange={(open) => {
          if (!open) setFormTarget(null);
        }}
        establecimiento={formTarget?.establecimiento}
      />
      <ArchiveEstablecimientoDialog
        establecimiento={archiveTarget}
        onClose={() => setArchiveTarget(null)}
      />
    </div>
  );
}
