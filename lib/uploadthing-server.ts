import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

export async function deleteUploadedFile(key: string): Promise<void> {
  try {
    await utapi.deleteFiles(key);
  } catch {
    // Mejor esfuerzo: el registro en BD ya cambió.
  }
}

// ponytail: plan gratuito sin archivos privados; devuelve la URL pública del archivo.
export async function getSignedFileUrl(key: string): Promise<string | null> {
  const { data } = await utapi.getFileUrls(key);
  return data[0]?.url ?? null;
}
