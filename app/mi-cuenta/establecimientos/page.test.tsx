import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
const listOwnEstablecimientos = vi.hoisted(() => vi.fn());

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("@/modules/establecimientos/services/establecimiento.service", () => ({
  listOwnEstablecimientos,
}));
vi.mock("@/modules/establecimientos/components/EstablecimientosView", () => ({
  EstablecimientosView: () => null,
}));

import EstablecimientosPage from "./page";

describe("/mi-cuenta/establecimientos", () => {
  beforeEach(() => vi.resetAllMocks());

  it("exige cliente y lee los establecimientos del usuario", async () => {
    const usuario = { id: "u1" };
    const lista = [{ id: "e1" }];
    requireRole.mockResolvedValue(usuario);
    listOwnEstablecimientos.mockResolvedValue(lista);

    const element = await EstablecimientosPage();

    expect(requireRole).toHaveBeenCalledWith("cliente");
    expect(listOwnEstablecimientos).toHaveBeenCalledWith(usuario);
    expect(element.props.establecimientos).toBe(lista);
  });

  it("si requireRole redirige no consulta el servicio", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(EstablecimientosPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(listOwnEstablecimientos).not.toHaveBeenCalled();
  });
});
