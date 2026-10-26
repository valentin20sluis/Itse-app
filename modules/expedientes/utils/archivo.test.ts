import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, MAX_PDF_BYTES, validateArchivo } from "./archivo";

const pdf = (size: number, name = "a.pdf") => ({ name, type: "application/pdf", size });
const img = (size: number, type = "image/png") => ({ name: "a.png", type, size });

describe("validateArchivo", () => {
  it("acepta PDF hasta 8 MB", () => {
    expect(validateArchivo(pdf(MAX_PDF_BYTES))).toEqual({ ok: true });
  });
  it("rechaza PDF de 8 MB + 1", () => {
    expect(validateArchivo(pdf(MAX_PDF_BYTES + 1))).toEqual({
      ok: false,
      error: "El PDF no puede superar 8 MB.",
    });
  });
  it("acepta imágenes JPEG/PNG/WebP hasta 4 MB", () => {
    for (const t of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateArchivo(img(MAX_IMAGE_BYTES, t))).toEqual({ ok: true });
    }
  });
  it("rechaza imagen de 4 MB + 1", () => {
    expect(validateArchivo(img(MAX_IMAGE_BYTES + 1))).toEqual({
      ok: false,
      error: "La imagen no puede superar 4 MB.",
    });
  });
  it("rechaza tipos no permitidos", () => {
    for (const type of ["application/x-msdownload", "text/html"]) {
      const r = validateArchivo({ name: "x.exe", type, size: 10 });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/no permitido/);
    }
  });
  it("rechaza tamaño 0", () => {
    expect(validateArchivo(pdf(0))).toEqual({ ok: false, error: "El archivo está vacío." });
  });
  it("rechaza nombre vacío", () => {
    expect(validateArchivo(pdf(10, "  "))).toEqual({
      ok: false,
      error: "El archivo debe tener un nombre.",
    });
  });
});
