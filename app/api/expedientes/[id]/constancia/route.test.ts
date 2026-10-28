import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  usuario: vi.fn(),
  data: vi.fn(),
  render: vi.fn(),
}));

vi.mock("@/modules/usuarios/services/user.service", () => ({ getOrCreateUser: h.usuario }));
vi.mock("@/modules/inspecciones/services/constancia.service", () => ({ getConstanciaData: h.data }));
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: h.render }));
vi.mock("@/modules/inspecciones/components/ConstanciaDesignacionDocument", () => ({
  ConstanciaDesignacionDocument: () => ({}),
}));

import { GET } from "@/app/api/expedientes/[id]/constancia/route";

const ID = "11111111-1111-4111-8111-111111111111";
const llamar = (id: string = ID) =>
  GET(new Request("http://localhost/api/expedientes/x/constancia"), { params: Promise.resolve({ id }) });

beforeEach(() => {
  h.usuario.mockReset().mockResolvedValue({ id: "u1", rol: "admin", activo: true });
  h.data.mockReset().mockResolvedValue({ numero: "CD-2026-00001" });
  h.render.mockReset().mockResolvedValue(Buffer.from("%PDF-1.3 demo"));
});

describe("GET /api/expedientes/[id]/constancia", () => {
  it("401 sin usuario o inactivo", async () => {
    h.usuario.mockResolvedValue(null);
    expect((await llamar()).status).toBe(401);
    h.usuario.mockResolvedValue({ id: "u1", rol: "admin", activo: false });
    expect((await llamar()).status).toBe(401);
  });

  it("404 para cliente sin consultar datos", async () => {
    h.usuario.mockResolvedValue({ id: "u2", rol: "cliente", activo: true });
    expect((await llamar()).status).toBe(404);
    expect(h.data).not.toHaveBeenCalled();
  });

  it("404 con id no uuid y con datos null", async () => {
    expect((await llamar("abc")).status).toBe(404);
    h.data.mockResolvedValue(null);
    expect((await llamar()).status).toBe(404);
    expect(h.render).not.toHaveBeenCalled();
  });

  it("200 con PDF y cabeceras para admin y superadmin", async () => {
    for (const rol of ["admin", "superadmin"]) {
      h.usuario.mockResolvedValue({ id: "u1", rol, activo: true });
      const res = await llamar();
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="constancia-CD-2026-00001.pdf"');
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
      expect(Buffer.from(await res.arrayBuffer()).toString().startsWith("%PDF")).toBe(true);
    }
  });
});
