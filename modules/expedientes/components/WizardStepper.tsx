import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const PASOS_WIZARD = [
  "Establecimiento",
  "Riesgo",
  "Solicitante",
  "Documentos",
  "Resumen",
] as const;

export function WizardStepper({ pasoActual }: { pasoActual: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <nav aria-label="Pasos de la solicitud">
      <p className="text-sm font-medium md:hidden">
        Paso {pasoActual} de {PASOS_WIZARD.length}: {PASOS_WIZARD[pasoActual - 1]}
      </p>
      <ol className="hidden items-center gap-2 md:flex">
        {PASOS_WIZARD.map((titulo, i) => {
          const n = i + 1;
          const estado = n < pasoActual ? "completado" : n === pasoActual ? "actual" : "pendiente";
          return (
            <li
              key={titulo}
              aria-current={estado === "actual" ? "step" : undefined}
              className={cn(
                "flex flex-1 items-center gap-2 text-sm",
                estado === "pendiente" ? "text-muted-foreground" : "text-foreground",
                estado === "actual" && "font-medium",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs",
                  estado === "completado" && "border-primary bg-primary text-primary-foreground",
                  estado === "actual" && "border-primary text-primary",
                )}
              >
                {estado === "completado" ? <Check className="size-4" /> : n}
              </span>
              <span>
                {titulo}
                <span className="sr-only">
                  {estado === "completado" ? " (completado)" : estado === "actual" ? " (paso actual)" : " (pendiente)"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
