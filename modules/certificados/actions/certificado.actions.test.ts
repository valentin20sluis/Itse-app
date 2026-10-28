import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  prepararCertificado: vi.fn(),
}));

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole: mocks.requireRole }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/modules/certificados/services/certificado.service", () => ({
  prepararCertificado: mocks.prepararCertificado,
}));

import { prepararCertificadoAction } from "./certificado.actions";

const usuario = { id: "u-1", rol: "admin" };
const ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue(usuario);
});

describe("prepararCertificadoAction", () => {
  it("requireRole primero; si redirige no toca el servicio", async () => {
    mocks.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(prepararCertificadoAction(ID, null, new FormData())).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.requireRole).toHaveBeenCalledWith("admin", "superadmin");
    expect(mocks.prepararCertificado).not.toHaveBeenCalled();
  });

  it("id no uuid", async () => {
    expect(await prepararCertificadoAction("x", null, new FormData())).toEqual({ ok: false, error: "No se encontró el expediente." });
    expect(mocks.prepararCertificado).not.toHaveBeenCalled();
  });

  it.each([
    ["no_encontrado", "No se encontró el expediente."],
    ["no_permitido", "Esa acción no está disponible para este expediente."],
    ["conflicto", "El expediente cambió de estado. Actualiza la página e inténtalo de nuevo."],
  ])("%s: mensaje y sin revalidar", async (status, error) => {
    mocks.prepararCertificado.mockResolvedValue({ status });
    expect(await prepararCertificadoAction(ID, null, new FormData())).toEqual({ ok: false, error });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("error inesperado", async () => {
    mocks.prepararCertificado.mockRejectedValue(new Error("boom"));
    expect(await prepararCertificadoAction(ID, null, new FormData())).toEqual({
      ok: false,
      error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("éxito: usa el usuario de requireRole y revalida las 6 rutas", async () => {
    mocks.prepararCertificado.mockResolvedValue({ status: "ok" });
    expect(await prepararCertificadoAction(ID, null, new FormData())).toEqual({ ok: true, data: null });
    expect(mocks.prepararCertificado).toHaveBeenCalledWith(usuario, ID);
    expect(mocks.revalidatePath.mock.calls.map((c) => c[0])).toEqual([
      "/panel/expedientes",
      `/panel/expedientes/${ID}`,
      "/mi-cuenta/expedientes",
      `/mi-cuenta/expedientes/${ID}`,
      "/panel/certificados",
      "/mi-cuenta/certificados",
    ]);
  });
});
