import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ConstanciaDesignacionDocument } from "@/modules/inspecciones/components/ConstanciaDesignacionDocument";
import { getConstanciaData } from "@/modules/inspecciones/services/constancia.service";
import { getOrCreateUser } from "@/modules/usuarios/services/user.service";

const idSchema = z.uuid();

const notFound = () => new NextResponse("No se encontró la constancia.", { status: 404 });

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const usuario = await getOrCreateUser();
  if (!usuario || !usuario.activo) {
    return new NextResponse("No autorizado.", { status: 401 });
  }
  const { id } = await ctx.params;
  // 404 idéntico para cliente, id inválido o sin constancia: no se revela que existe.
  if (usuario.rol === "cliente" || !idSchema.safeParse(id).success) return notFound();

  const data = await getConstanciaData(usuario, id);
  if (!data) return notFound();

  const buffer = await renderToBuffer(ConstanciaDesignacionDocument({ data }));
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="constancia-${data.numero}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
