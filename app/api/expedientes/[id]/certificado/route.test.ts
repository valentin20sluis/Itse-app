import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  usuario: vi.fn(),
  data: vi.fn(),
  render: vi.fn(),
  qr: vi.fn(),
}));

vi.mock("@/modules/usuarios/services/user.service", () => ({ getOrCreateUser: h.usuario }));
vi.mock("@/modules/certificados/services/certificado-pdf.service", () => ({ getCertificadoPdfData: h.data }));
vi.mock("@/modules/certificados/utils/qr", async (orig) => ({
  ...(await orig<typeof import("@/modules/certificados/utils/qr")>()),
  generarQrDataUrl: h.qr,
}));
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: h.render }));
vi.mock("@/modules/certificados/components/CertificadoDocument", () => ({
  CertificadoDocument: () => ({}),
}));

import { GET } from "@/app/api/expedientes/[id]/certificado/route";

const ID = "11111111-1111-4111-8111-111111111111";
const llamar = (id: string = ID) =>
  GET(new Request("http://localhost/api/expedientes/x/certificado"), { params: Promise.resolve({ id }) });

beforeEach(() => {
  h.usuario.mockReset().mockResolvedValue({ id: "u1", rol: "admin", activo: true });
  h.data.mockReset().mockResolvedValue({ numero: "0001-2026", codigo: "ABCDEFGHJKMN" });
  h.qr.mockReset().mockResolvedValue("data:image/png;base64,AAAA");
  h.render.mockReset().mockResolvedValue(Buffer.from("%PDF-1.3 demo"));
});

describe("GET /api/expedientes/[id]/certificado", () => {
  it("401 sin usuario o inactivo", async () => {
    h.usuario.mockResolvedValue(null);
    expect((await llamar()).status).toBe(401);
    h.usuario.mockResolvedValue({ id: "u1", rol: "admin", activo: false });
    expect((await llamar()).status).toBe(401);
  });

  it("404 con id no uuid y con datos null (mismo cuerpo)", async () => {
    const a = await llamar("abc");
    h.data.mockResolvedValue(null);
    const b = await llamar();
    expect(a.status).toBe(404);
    expect(b.status).toBe(404);
    expect(await a.text()).toBe(await b.text());
    expect(h.render).not.toHaveBeenCalled();
  });

  it("el cliente pasa por el servicio, que decide el acceso", async () => {
    const cliente = { id: "u2", rol: "cliente", activo: true };
    h.usuario.mockResolvedValue(cliente);
    h.data.mockResolvedValue(null);
    expect((await llamar()).status).toBe(404);
    expect(h.data).toHaveBeenCalledWith(cliente, ID);
  });

  it("200 con PDF, cabeceras y QR con la URL de verificación", async () => {
    for (const rol of ["admin", "superadmin", "cliente"]) {
      h.usuario.mockResolvedValue({ id: "u1", rol, activo: true });
      const res = await llamar();
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="certificado-0001-2026.pdf"');
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
      expect(Buffer.from(await res.arrayBuffer()).toString().startsWith("%PDF")).toBe(true);
    }
    expect(h.qr).toHaveBeenCalledWith(expect.stringMatching(/\/verificar\/ABCDEFGHJKMN$/));
  });
});
