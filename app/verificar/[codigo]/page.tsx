import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { VerificacionResultado } from "@/modules/certificados/components/VerificacionResultado";
import { verificarCertificado } from "@/modules/certificados/services/verificacion.service";
import { SiteFooter } from "@/modules/landing/components/SiteFooter";
import { SiteHeader } from "@/modules/landing/components/SiteHeader";

export const metadata: Metadata = {
  title: "Verificar certificado",
  robots: { index: false, follow: false },
};

function decodificar(valor: string): string {
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}

export default async function VerificarPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const ahora = new Date();
  const resultado = await verificarCertificado(decodificar(codigo), ahora);
  if (resultado.status === "no_encontrado") notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <PageHeader title="Verificación de certificado" description="Resultado de la consulta del código." />
        <VerificacionResultado data={resultado.data} ahora={ahora} />
      </main>
      <SiteFooter />
    </>
  );
}
