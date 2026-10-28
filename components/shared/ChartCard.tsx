import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ChartCardProps = {
  title: string;
  summary: string;
  data: { label: string; value: number }[];
  valueHeader: string;
  children: ReactNode;
};

export function ChartCard({ title, summary, data, valueHeader, children }: ChartCardProps) {
  return (
    <Card>
      <CardContent>
        <figure className="flex min-w-0 flex-col gap-3">
          <figcaption className="text-base font-medium">{title}</figcaption>
          <p className="text-sm text-muted-foreground">{summary}</p>
          {data.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin datos para mostrar.</p>
          ) : (
            <>
              <div role="img" aria-label={`${title}. ${summary}`} className="w-full min-w-0">
                {children}
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-brand">Ver datos en tabla</summary>
                <Table className="mt-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">{valueHeader}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((d) => (
                      <TableRow key={d.label}>
                        <TableCell>{d.label}</TableCell>
                        <TableCell className="text-right">{d.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </details>
            </>
          )}
        </figure>
      </CardContent>
    </Card>
  );
}
