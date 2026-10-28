import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
const getUsuarioDetalle = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("@/modules/usuarios/services/usuario-admin.service", () => ({ getUsuarioDetalle }));
vi.mock("@/modules/usuarios/components/UsuarioDetalleView", () => ({ UsuarioDetalleView: () => null }));

import UsuarioDetallePage from "./page";

const ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";
const render = (id: string) => UsuarioDetallePage({ params: Promise.resolve({ id }) } as never);

describe("/panel/usuarios/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
  });

  it("id inválido llama notFound sin consultar", async () => {
    requireRole.mockResolvedValue({ id: "s1", rol: "superadmin" });
    await expect(render("abc")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getUsuarioDetalle).not.toHaveBeenCalled();
  });

  it("exige superadmin y pasa el detalle a la vista", async () => {
    const actor = { id: "s1", rol: "superadmin" };
    const detalle = { id: ID };
    requireRole.mockResolvedValue(actor);
    getUsuarioDetalle.mockResolvedValue(detalle);

    const el = await render(ID);

    expect(requireRole).toHaveBeenCalledWith("superadmin");
    expect(getUsuarioDetalle).toHaveBeenCalledWith(actor, ID);
    expect(el.props.usuario).toBe(detalle);
  });

  it("detalle null llama notFound", async () => {
    requireRole.mockResolvedValue({ id: "s1", rol: "superadmin" });
    getUsuarioDetalle.mockResolvedValue(null);
    await expect(render(ID)).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("si requireRole redirige no consulta el servicio", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(render(ID)).rejects.toThrow("NEXT_REDIRECT");
    expect(getUsuarioDetalle).not.toHaveBeenCalled();
  });
});
