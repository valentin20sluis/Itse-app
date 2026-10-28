import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { tipoDocumentoEnum } from "@/db/schema";
import { deleteUploadedFile } from "@/lib/uploadthing-server";
import {
  puedeSubirDocumento,
  registerDocumento,
} from "@/modules/expedientes/services/documento.service";
import { validateArchivo } from "@/modules/expedientes/utils/archivo";
import { DOCUMENTOS, esDocumentoSubsanacion } from "@/modules/expedientes/utils/documentos";
import { getOrCreateUser } from "@/modules/usuarios/services/user.service";

const f = createUploadthing();

const inputSchema = z.object({
  expedienteId: z.uuid(),
  tipo: z.enum(tipoDocumentoEnum.enumValues),
});

export const documentoFileRouter = {
  documentoExpediente: f(
    {
      pdf: { maxFileSize: "8MB", maxFileCount: 1 },
      image: { maxFileSize: "4MB", maxFileCount: 1 },
    },
  )
    .input(inputSchema)
    .middleware(async ({ input }) => {
      const usuario = await getOrCreateUser();
      if (!usuario || !usuario.activo || usuario.rol !== "cliente") {
        throw new UploadThingError("No tienes permiso para subir archivos.");
      }
      if (!DOCUMENTOS.some((d) => d.tipo === input.tipo) && !esDocumentoSubsanacion(input.tipo)) {
        throw new UploadThingError("Tipo de documento no válido.");
      }
      if (!(await puedeSubirDocumento(usuario, input.expedienteId, input.tipo))) {
        throw new UploadThingError("No se encontró la solicitud.");
      }
      return { usuario, expedienteId: input.expedienteId, tipo: input.tipo };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const check = validateArchivo({ name: file.name, type: file.type, size: file.size,
        tipo: metadata.tipo,
      });
      if (!check.ok) {
        await deleteUploadedFile(file.key);
        throw new UploadThingError(check.error);
      }
      const result = await registerDocumento(metadata.usuario, metadata.expedienteId, {
        tipo: metadata.tipo,
        fileKey: file.key,
        nombreOriginal: file.name,
        mimeType: file.type,
        tamanoBytes: file.size,
      });
      if (!result || result.status === "invalido") {
        await deleteUploadedFile(file.key);
        throw new UploadThingError(
          result?.status === "invalido" ? result.error : "No se encontró la solicitud.",
        );
      }
      if (result.previousFileKey) await deleteUploadedFile(result.previousFileKey);
      return { id: result.documento.id };
    }),
} satisfies FileRouter;

export type DocumentoFileRouter = typeof documentoFileRouter;
