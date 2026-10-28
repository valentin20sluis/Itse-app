import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
const listUsuarios = vi.hoisted(() => vi.fn());

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("@/modules/usuarios/services/usuario-admin.service", () => ({ listUsuarios }));
vi.mock("@/modules/usuarios/components/UsuariosView", () => ({ UsuariosView: () => null }));

import UsuariosPage from "./page";

describe("/panel/usuarios", () => {
  beforeEach(() => vi.resetAllMocks());

  it("exige superadmin antes de leer y pasa filtros normalizados", async () => {
    const actor = { id: "s1", rol: "superadmin" };
    const datos = { items: [] };
    requireRole.mockResolvedValue(actor);
    listUsuarios.mockResolvedValue(datos);

    const el = await UsuariosPage({ searchParams: Promise.resolve({ pagina: "x", rol: "otro" }) });

    expect(requireRole).toHaveBeenCalledWith("superadmin");
    expect(listUsuarios).toHaveBeenCalledWith(actor, expect.objectContaining({ pagina: 1 }));
    expect(el.props.datos).toBe(datos);
    expect(requireRole.mock.invocationCallOrder[0]).toBeLessThan(
      listUsuarios.mock.invocationCallOrder[0],
    );
  });

  it("si requireRole redirige no consulta el servicio", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(UsuariosPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    expect(listUsuarios).not.toHaveBeenCalled();
  });
});
