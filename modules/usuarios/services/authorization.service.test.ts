import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getOrCreateUser: vi.fn(), redirect: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/modules/usuarios/services/user.service", () => ({
  getOrCreateUser: mocks.getOrCreateUser,
}));

import { requireRole } from "./authorization.service";

describe("requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    });
  });

  it("sin sesión redirige a /sign-in", async () => {
    mocks.getOrCreateUser.mockResolvedValue(null);
    await expect(requireRole("cliente")).rejects.toThrow("REDIRECT:/sign-in");
  });

  it("usuario inactivo redirige a /cuenta-desactivada", async () => {
    mocks.getOrCreateUser.mockResolvedValue({ rol: "cliente", activo: false });
    await expect(requireRole("cliente")).rejects.toThrow("REDIRECT:/cuenta-desactivada");
  });

  it("rol no permitido redirige a su home", async () => {
    mocks.getOrCreateUser.mockResolvedValue({ rol: "cliente", activo: true });
    await expect(requireRole("admin", "superadmin")).rejects.toThrow("REDIRECT:/mi-cuenta");

    mocks.getOrCreateUser.mockResolvedValue({ rol: "admin", activo: true });
    await expect(requireRole("cliente")).rejects.toThrow("REDIRECT:/panel");
  });

  it("rol permitido devuelve el usuario", async () => {
    const usuario = { rol: "admin", activo: true };
    mocks.getOrCreateUser.mockResolvedValue(usuario);
    await expect(requireRole("admin", "superadmin")).resolves.toBe(usuario);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
