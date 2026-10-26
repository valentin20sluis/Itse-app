import { UserButton } from "@clerk/nextjs";

import { Badge } from "@/components/ui/badge";

type UserSummaryProps = {
  name: string;
  roleLabel?: string;
};

export function UserSummary({ name, roleLabel }: UserSummaryProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm font-medium text-foreground sm:inline">
        {name}
      </span>
      {roleLabel && <Badge variant="secondary">{roleLabel}</Badge>}
      <UserButton />
    </div>
  );
}
