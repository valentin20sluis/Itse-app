import Link from "next/link";
import { findNavItem } from "@/modules/navigation/utils/nav-utils";

const ACCESOS = [
  { href: "/mi-cuenta/establecimientos", ayuda: "Registra o revisa tus locales.", requiereSolicitar: false },
  { href: "/mi-cuenta/nueva-solicitud", ayuda: "Inicia una inspección para un local.", requiereSolicitar: true },
  { href: "/mi-cuenta/expedientes", ayuda: "Mira el avance de tus trámites.", requiereSolicitar: false },
  { href: "/mi-cuenta/certificados", ayuda: "Descarga tus certificados.", requiereSolicitar: false },
];

export function AccesosRapidos({ puedeSolicitar }: { puedeSolicitar: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {ACCESOS.filter((a) => puedeSolicitar || !a.requiereSolicitar).map((a) => {
        const item = findNavItem("cliente", a.href);
        if (!item) return null;
        const Icono = item.icon;
        return (
          <li key={a.href} className="min-w-0">
            <Link
              href={a.href}
              className="flex h-full min-h-11 flex-col gap-1 rounded-xl bg-card p-3 text-sm shadow-sm ring-1 ring-foreground/20 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex items-center gap-2 font-medium text-brand">
                <Icono aria-hidden="true" className="size-4 shrink-0" />
                <span className="min-w-0 break-words">{item.label}</span>
              </span>
              <span className="break-words text-muted-foreground">{a.ayuda}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
