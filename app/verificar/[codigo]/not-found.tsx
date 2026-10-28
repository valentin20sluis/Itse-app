import Link from "next/link";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { SiteFooter } from "@/modules/landing/components/SiteFooter";
import { SiteHeader } from "@/modules/landing/components/SiteHeader";

export const metadata: Metadata = {
  title: "Certificado no encontrado",
  robots: { index: false, follow: false },
};

export default function VerificarNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start gap-4 px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight text-brand">Certificado no encontrado</h1>
        <p>No encontramos un certificado con ese código. Revisa que lo hayas escrito bien.</p>
        <Link href="/#verificar-certificado" className={buttonVariants({ className: "min-h-11" })}>
          Volver a verificar
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
