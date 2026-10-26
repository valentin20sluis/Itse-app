import { CalendarClock, ClipboardList, FileCheck, Hourglass } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CARDS = [
  { title: "Expedientes en revisión", icon: ClipboardList },
  { title: "Plazos por vencer", icon: Hourglass },
  { title: "Inspecciones programadas", icon: CalendarClock },
  { title: "Certificados por vencer", icon: FileCheck },
];

export default function PanelPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Resumen de la gestión de expedientes ITSE." />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
        {CARDS.map(({ title, icon: Icon }) => (
          <Card key={title} className="min-w-0 text-sm">
            <CardHeader>
              <CardTitle className="text-sm">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={<Icon aria-hidden="true" />}
                title="Sin datos por ahora"
                description="Próximamente verás aquí esta información."
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
