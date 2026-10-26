import { Building2, FileText, Plus } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { findNavItem } from "@/modules/navigation/utils/nav-utils";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export default async function MiCuentaPage() {
  const usuario = await requireRole("cliente");
  const saludo = usuario.nombres.trim() || usuario.email;

  return (
    <>
      <PageHeader
        title={`Hola, ${saludo}`}
        description="Aquí puedes seguir tus trámites de ITSE."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{findNavItem("cliente", "/mi-cuenta/expedientes")?.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<FileText aria-hidden="true" />}
              title="Aún no tienes expedientes"
              description="Cuando presentes una solicitud, podrás seguir su avance aquí."
              action={
                <Link
                  href="/mi-cuenta/nueva-solicitud"
                  className={buttonVariants({ size: "lg" })}
                >
                  <Plus aria-hidden="true" />
                  Iniciar mi primera solicitud
                </Link>
              }
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{findNavItem("cliente", "/mi-cuenta/establecimientos")?.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<Building2 aria-hidden="true" />}
              title="Aún no has registrado establecimientos"
              description="Registra tu local para poder solicitar la inspección."
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
