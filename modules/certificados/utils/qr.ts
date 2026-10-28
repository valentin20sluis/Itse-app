import QRCode from "qrcode";

export function urlVerificacion(base: string, codigo: string): string {
  return `${base.replace(/\/+$/, "")}/verificar/${codigo.replace(/-/g, "")}`;
}

export async function generarQrDataUrl(url: string): Promise<string> {
  if (!url) throw new Error("URL vacía");
  return QRCode.toDataURL(url, { margin: 1, width: 240 });
}
