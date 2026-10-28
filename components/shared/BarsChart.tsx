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
const MAX_CARACTERES = 16;
const ALTO_BARRA = 36;

type TickProps = { x?: number | string; y?: number | string; payload?: { value?: string | number } };

// El texto largo se abrevia y el <title> conserva el nombre completo.
function crearTick(anchor: "start" | "middle" | "end") {
  return function Tick({ x, y, payload }: TickProps) {
    const texto = String(payload?.value ?? "");
    const corto = texto.length > MAX_CARACTERES ? `${texto.slice(0, MAX_CARACTERES - 1)}…` : texto;
    return (
      <text x={x} y={y} dy={anchor === "end" ? 4 : 12} textAnchor={anchor} className="fill-muted-foreground">
        <title>{texto}</title>
        {corto}
      </text>
    );
  };
}

const TickCategoriaY = crearTick("end");
const TickCategoriaX = crearTick("middle");

export function BarsChart({ data, orientation = "horizontal", valueLabel, height }: BarsChartProps) {
  const horizontal = orientation === "horizontal";
  const alto = height ?? (horizontal ? Math.max(120, data.length * ALTO_BARRA + 16) : 260);
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
            <XAxis type="category" dataKey="label" tickLine={false} axisLine={false} tick={TickCategoriaX} interval={0} />
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
