import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrCreateUser: vi.fn(),
  getDocumentoForDownload: vi.fn(),
  getSignedFileUrl: vi.fn(),
}));

vi.mock("@/modules/usuarios/services/user.service", () => ({
  getOrCreateUser: mocks.getOrCreateUser,
}));
vi.mock("@/modules/expedientes/services/documento.service", () => ({
  getDocumentoForDownload: mocks.getDocumentoForDownload,
}));
vi.mock("@/lib/uploadthing-server", () => ({ getSignedFileUrl: mocks.getSignedFileUrl }));

import { GET } from "./route";

const ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";
const usuario = { id: "u-1", rol: "cliente", activo: true };

const call = (id: string, tipo: string | null = "FICHA_RUC") =>
  GET(new Request(`http://localhost/api/documentos/${id}${tipo ? `?tipo=${tipo}` : ""}`), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getOrCreateUser.mockResolvedValue(usuario);
});

describe("GET /api/documentos/[id]", () => {
  it("sin sesión o inactivo: 401", async () => {
    mocks.getOrCreateUser.mockResolvedValue(null);
    expect((await call(ID)).status).toBe(401);
    mocks.getOrCreateUser.mockResolvedValue({ ...usuario, activo: false });
    expect((await call(ID)).status).toBe(401);
    expect(mocks.getDocumentoForDownload).not.toHaveBeenCalled();
  });

  it("id no uuid o tipo inválido: 404 sin llamar al servicio", async () => {
    expect((await call("abc")).status).toBe(404);
    expect((await call(ID, "XXX")).status).toBe(404);
    expect((await call(ID, null)).status).toBe(404);
    expect(mocks.getDocumentoForDownload).not.toHaveBeenCalled();
  });

  it("servicio null: 404 con el mismo cuerpo", async () => {
    mocks.getDocumentoForDownload.mockResolvedValue(null);
    const a = await call(ID);
    const b = await call("abc");
    expect(a.status).toBe(404);
    expect(await a.text()).toBe(await b.text());
  });

  it("éxito: 302 a la URL, con el usuario de la sesión", async () => {
    mocks.getDocumentoForDownload.mockResolvedValue({ fileKey: "k-1" });
    mocks.getSignedFileUrl.mockResolvedValue("https://ufs.test/f/k-1");
    const res = await call(ID);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://ufs.test/f/k-1");
    expect(mocks.getDocumentoForDownload).toHaveBeenCalledWith(usuario, ID, "FICHA_RUC");
  });
});
