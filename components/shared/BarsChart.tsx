"use client";

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type Token = 1 | 2 | 3 | 4 | 5;

type BarsChartProps = {
  data: { label: string; value: number; token?: Token }[];
  orientation?: "horizontal" | "vertical";
  valueLabel: string;
  height?: number;
};

const ANCHO_EJE = 110;
const ALTO_BARRA = 44;
const LINEA_Y = 18; // caracteres por línea en el eje de categorías (110 px)
const LINEA_X = 7; // caracteres por línea en el eje de meses
const ETIQUETAS_X_VISIBLES = 6;

type TickProps = { x?: number | string; y?: number | string; payload?: { value?: string | number } };

// Parte la etiqueta en hasta 2 líneas por palabras; si aún no cabe, la segunda se abrevia.
export function partirEtiqueta(texto: string, max: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(" ")) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (prueba.length <= max || !actual) actual = prueba;
    else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  lineas.push(actual);
  if (lineas.length <= 2) return lineas;
  const resto = lineas.slice(1).join(" ");
  return [lineas[0], resto.length > max ? `${resto.slice(0, max - 1)}…` : resto];
}

// El texto se reparte en 2 líneas y el <title> conserva el nombre completo.
function crearTick(anchor: "end" | "middle", max: number) {
  return function Tick({ x, y, payload }: TickProps) {
    const texto = String(payload?.value ?? "");
    const lineas = partirEtiqueta(texto, max);
    const dy0 = anchor === "end" ? (lineas.length > 1 ? -2 : 4) : 12;
    return (
      <text x={x} y={y} textAnchor={anchor} className="fill-muted-foreground">
        <title>{texto}</title>
        {lineas.map((linea, i) => (
          <tspan key={i} x={x} dy={i === 0 ? dy0 : 13}>
            {linea}
          </tspan>
        ))}
      </text>
    );
  };
}

const TickCategoriaY = crearTick("end", LINEA_Y);
const TickCategoriaX = crearTick("middle", LINEA_X);

export function BarsChart({ data, orientation = "horizontal", valueLabel, height }: BarsChartProps) {
  const horizontal = orientation === "horizontal";
  const alto = height ?? (horizontal ? Math.max(120, data.length * ALTO_BARRA + 16) : 260);
  // Con muchos meses se muestra una etiqueta de cada N para que no se monten unas sobre otras.
  // El conteo parte del final: la última etiqueta (el mes más reciente) siempre se ve.
  const pasoX = Math.max(1, Math.ceil(data.length / ETIQUETAS_X_VISIBLES));
  const ticksX = data.map((d) => d.label).filter((_, i) => (data.length - 1 - i) % pasoX === 0);
  const config: ChartConfig = { value: { label: valueLabel, color: "var(--chart-1)" } };

  return (
    <ChartContainer config={config} className="aspect-auto w-full min-w-0" style={{ height: alto }}>
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 20, right: horizontal ? 32 : 8, bottom: 0, left: 0 }}
      >
        {horizontal ? (
          <>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="label" width={ANCHO_EJE} tickLine={false} axisLine={false} tick={TickCategoriaY} interval={0} />
          </>
        ) : (
          <>
            <XAxis type="category" dataKey="label" tickLine={false} axisLine={false} tick={TickCategoriaX} ticks={ticksX} interval={0} height={44} />
            <YAxis type="number" hide />
          </>
        )}
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="value" name={valueLabel} radius={4} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.label} fill={`var(--chart-${d.token ?? 1})`} />
          ))}
          <LabelList dataKey="value" position={horizontal ? "right" : "top"} className="fill-foreground text-xs font-medium" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
