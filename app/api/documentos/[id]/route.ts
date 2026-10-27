import { NextResponse } from "next/server";
import { z } from "zod";
import { tipoDocumentoEnum } from "@/db/schema";
import { getSignedFileUrl } from "@/lib/uploadthing-server";
import { getDocumentoForDownload } from "@/modules/expedientes/services/documento.service";
import { getOrCreateUser } from "@/modules/usuarios/services/user.service";

const idSchema = z.uuid();
const tipoSchema = z.enum(tipoDocumentoEnum.enumValues);

const notFound = () => new NextResponse("No se encontró el documento.", { status: 404 });

// [id] es el id del expediente y ?tipo= el tipo de documento (el servicio busca por ese par).
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const usuario = await getOrCreateUser();
  if (!usuario || !usuario.activo) {
    return new NextResponse("No autorizado.", { status: 401 });
  }
  const { id } = await ctx.params;
  const tipo = tipoSchema.safeParse(new URL(request.url).searchParams.get("tipo"));
  if (!idSchema.safeParse(id).success || !tipo.success) return notFound();

  const documento = await getDocumentoForDownload(usuario, id, tipo.data);
  if (!documento) return notFound();
  const url = await getSignedFileUrl(documento.fileKey);
  if (!url) return notFound();
  return NextResponse.redirect(url, 302);
}
