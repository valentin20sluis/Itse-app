import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  usuario: vi.fn(),
  data: vi.fn(),
  noCumple: vi.fn(),
  render: vi.fn(),
}));

vi.mock("@/modules/usuarios/services/user.service", () => ({ getOrCreateUser: h.usuario }));
vi.mock("@/modules/certificados/services/resolucion-pdf.service", () => ({
  getResolucionPdfData: h.data,
  getResolucionNoCumplePdfData: h.noCumple,
}));
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: h.render }));
vi.mock("@/modules/certificados/components/ResolucionDocument", () => ({
  ResolucionDocument: () => ({}),
}));

import { GET } from "@/app/api/expedientes/[id]/resolucion/route";

const ID = "11111111-1111-4111-8111-111111111111";
const llamar = (id: string = ID) =>
  GET(new Request("http://localhost/api/expedientes/x/resolucion"), { params: Promise.resolve({ id }) });

beforeEach(() => {
  h.usuario.mockReset().mockResolvedValue({ id: "u1", rol: "admin", activo: true });
  h.data.mockReset().mockResolvedValue({ resolucionNumero: "RG-2026-0001" });
  h.noCumple.mockReset().mockResolvedValue(null);
  h.render.mockReset().mockResolvedValue(Buffer.from("%PDF-1.3 demo"));
});

describe("GET /api/expedientes/[id]/resolucion", () => {
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

  it("200 con la variante de no cumple cuando no hay resolución con certificado", async () => {
    h.data.mockResolvedValue(null);
    h.noCumple.mockResolvedValue({ tipo: "NO_CUMPLE", resolucionNumero: "RG-2026-0002" });
    const res = await llamar();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="resolucion-RG-2026-0002.pdf"');
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("con certificado no consulta la variante de no cumple", async () => {
    await llamar();
    expect(h.noCumple).not.toHaveBeenCalled();
  });

  it("200 con PDF y cabeceras", async () => {
    for (const rol of ["admin", "superadmin", "cliente"]) {
      h.usuario.mockResolvedValue({ id: "u1", rol, activo: true });
      const res = await llamar();
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="resolucion-RG-2026-0001.pdf"');
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
      expect(Buffer.from(await res.arrayBuffer()).toString().startsWith("%PDF")).toBe(true);
    }
  });
});
