import { describe, expect, it } from "vitest";
import { generarQrDataUrl, urlVerificacion } from "@/modules/certificados/utils/qr";

describe("urlVerificacion", () => {
  it("quita la barra final y los guiones", () => {
    expect(urlVerificacion("http://localhost:3000/", "ABCD-EFGH-JKMN")).toBe(
      "http://localhost:3000/verificar/ABCDEFGHJKMN",
    );
  });
  it("funciona sin barra final y sin guiones", () => {
    expect(urlVerificacion("https://itse.example", "ABCDEFGHJKMN")).toBe(
      "https://itse.example/verificar/ABCDEFGHJKMN",
    );
  });
});

describe("generarQrDataUrl", () => {
  it("devuelve un PNG como data URL", async () => {
    expect(await generarQrDataUrl("http://localhost:3000/verificar/ABCDEFGHJKMN")).toMatch(
      /^data:image\/png;base64,/,
    );
  });
  it("rechaza una cadena vacía", async () => {
    await expect(generarQrDataUrl("")).rejects.toThrow();
  });
});
