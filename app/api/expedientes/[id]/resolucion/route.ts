import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ResolucionDocument } from "@/modules/certificados/components/ResolucionDocument";
import {
  getResolucionNoCumplePdfData,
  getResolucionPdfData,
} from "@/modules/certificados/services/resolucion-pdf.service";
import { getOrCreateUser } from "@/modules/usuarios/services/user.service";

const idSchema = z.uuid();

const notFound = () => new NextResponse("No se encontró la resolución.", { status: 404 });

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const usuario = await getOrCreateUser();
  if (!usuario || !usuario.activo) {
    return new NextResponse("No autorizado.", { status: 401 });
  }
  const { id } = await ctx.params;
  // 404 idéntico para id inválido, ajeno, inexistente o aún no entregado: no se revela que existe.
  if (!idSchema.safeParse(id).success) return notFound();

  const data =
    (await getResolucionPdfData(usuario, id)) ?? (await getResolucionNoCumplePdfData(usuario, id));
  if (!data) return notFound();

  const buffer = await renderToBuffer(ResolucionDocument({ data }));
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="resolucion-${data.resolucionNumero}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
