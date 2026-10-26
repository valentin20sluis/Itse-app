import type { ReactNode } from "react";

import { Logo } from "@/components/shared/Logo";
import { UserSummary } from "@/modules/navigation/components/UserSummary";
import { ClientNav } from "./ClientNav";

export function ClientShell({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-card px-4">
        <Logo />
        <UserSummary name={name} />
      </header>
      <div className="flex flex-1">
        <ClientNav />
        <main className="min-w-0 flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
