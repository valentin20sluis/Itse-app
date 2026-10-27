import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
const listOwnExpedientes = vi.hoisted(() => vi.fn());

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("@/modules/expedientes/services/expediente.service", () => ({ listOwnExpedientes }));
vi.mock("@/modules/expedientes/components/ExpedientesView", () => ({
  ExpedientesView: () => null,
}));

import ExpedientesPage from "./page";

describe("/mi-cuenta/expedientes", () => {
  beforeEach(() => vi.resetAllMocks());

  it("exige cliente y lee los expedientes del usuario", async () => {
    const usuario = { id: "u1" };
    const lista = [{ id: "x1" }];
    requireRole.mockResolvedValue(usuario);
    listOwnExpedientes.mockResolvedValue(lista);

    const element = await ExpedientesPage();

    expect(requireRole).toHaveBeenCalledWith("cliente");
    expect(listOwnExpedientes).toHaveBeenCalledWith(usuario);
    expect(element.props.expedientes).toBe(lista);
  });

  it("si requireRole redirige no consulta el servicio", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(ExpedientesPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(listOwnExpedientes).not.toHaveBeenCalled();
  });
});
