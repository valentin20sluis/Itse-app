export const MAX_PDF_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type ArchivoInfo = { name: string; type: string; size: number };
type ArchivoResult = { ok: true } | { ok: false; error: string };

export function validateArchivo({ name, type, size }: ArchivoInfo): ArchivoResult {
  if (name.trim().length === 0) return { ok: false, error: "El archivo debe tener un nombre." };
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(type)) {
    return { ok: false, error: "Tipo de archivo no permitido. Sube un PDF, JPEG, PNG o WebP." };
  }
  if (size <= 0) return { ok: false, error: "El archivo está vacío." };
  if (type === "application/pdf" && size > MAX_PDF_BYTES) {
    return { ok: false, error: "El PDF no puede superar 8 MB." };
  }
  if (type !== "application/pdf" && size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "La imagen no puede superar 4 MB." };
  }
  return { ok: true };
}
