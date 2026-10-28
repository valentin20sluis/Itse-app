import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type KpiCardProps = {
  title: string;
  value: number;
  href: string;
  linkLabel?: string;
};

export function KpiCard({ title, value, href, linkLabel = "Ver lista" }: KpiCardProps) {
  return (
    <Card className="min-w-0 text-sm">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-4xl font-bold tabular-nums text-brand">{value}</p>
        <Link
          href={href}
          className="inline-flex min-h-11 items-center self-start rounded-md font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {linkLabel}
          <span className="sr-only">: {title}</span>
        </Link>
      </CardContent>
    </Card>
  );
}
