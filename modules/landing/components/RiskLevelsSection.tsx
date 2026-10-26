import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { riskLevels } from "@/modules/landing/data/risk-levels";

export function RiskLevelsSection() {
  return (
    <section id="niveles-de-riesgo" className="scroll-mt-20 bg-muted/40 py-16">
      <Reveal className="mx-auto max-w-6xl px-4">
        <SectionHeader
          title="Niveles de riesgo"
          subtitle="Según tu nivel de riesgo, la inspección se hace antes o después de la licencia."
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {riskLevels.map((level) => (
            <li key={level.id}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg text-brand">{level.label}</CardTitle>
                  <div>
                    <Badge variant={level.itseType === "PREVIA" ? "default" : "secondary"}>
                      {level.itseType === "PREVIA" ? "ITSE previa" : "ITSE posterior"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <p>{level.timing}</p>
                  <p className="font-medium">
                    {level.inspectors} {level.inspectors === 1 ? "inspector" : "inspectores"}
                  </p>
                  <p className="text-muted-foreground">{level.description}</p>
                  {level.examples && (
                    <p className="text-muted-foreground">
                      Ejemplos: {level.examples.join(", ").toLowerCase()}.
                    </p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          La clasificación final la confirma la municipalidad.
        </p>
      </Reveal>
    </section>
  );
}
