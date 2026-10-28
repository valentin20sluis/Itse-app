"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { getNavSections, isActivePath } from "@/modules/navigation/utils/nav-utils";

const items = getNavSections("cliente", "cliente").flatMap((s) => s.items);

export function ClientNav() {
  const pathname = usePathname();

  return (
    <>
      <nav
        aria-label="Menú principal"
        className="hidden w-60 shrink-0 flex-col gap-1 border-r border-border bg-card p-3 md:flex"
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <nav
        aria-label="Menú móvil"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-border bg-card md:hidden"
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-xs font-medium leading-tight",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="w-full truncate text-center">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
