import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CertificadoDocument } from "@/modules/certificados/components/CertificadoDocument";
import { getCertificadoPdfData } from "@/modules/certificados/services/certificado-pdf.service";
import { generarQrDataUrl, urlVerificacion } from "@/modules/certificados/utils/qr";
import { getOrCreateUser } from "@/modules/usuarios/services/user.service";

const idSchema = z.uuid();

const notFound = () => new NextResponse("No se encontró el certificado.", { status: 404 });

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const usuario = await getOrCreateUser();
  if (!usuario || !usuario.activo) {
    return new NextResponse("No autorizado.", { status: 401 });
  }
  const { id } = await ctx.params;
  // 404 idéntico para id inválido, ajeno, inexistente, anulado o aún no descargable: no se revela que existe.
  if (!idSchema.safeParse(id).success) return notFound();

  const data = await getCertificadoPdfData(usuario, id);
  if (!data) return notFound();

  const url = urlVerificacion(process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin, data.codigo);
  const qrDataUrl = await generarQrDataUrl(url);
  const buffer = await renderToBuffer(CertificadoDocument({ data, qrDataUrl, urlVerificacion: url }));
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": data.borrador
        ? `inline; filename="certificado-${data.numero}-borrador.pdf"`
        : `attachment; filename="certificado-${data.numero}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
