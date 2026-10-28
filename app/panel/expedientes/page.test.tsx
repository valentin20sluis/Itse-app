import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
const listExpedientesPanel = vi.hoisted(() => vi.fn());

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("@/modules/expedientes/services/bandeja.service", () => ({ listExpedientesPanel }));
vi.mock("@/modules/expedientes/components/BandejaView", () => ({ BandejaView: () => null }));

import BandejaPage from "./page";

describe("/panel/expedientes", () => {
  beforeEach(() => vi.resetAllMocks());

  it("exige admin o superadmin y pasa el usuario y los filtros al servicio", async () => {
    const usuario = { id: "u1", rol: "admin" };
    const resultado = { items: [], total: 0, page: 2, pageSize: 20 };
    requireRole.mockResolvedValue(usuario);
    listExpedientesPanel.mockResolvedValue(resultado);

    const element = await BandejaPage({
      searchParams: Promise.resolve({ estado: "EN_REVISION", q: " EXP ", page: "2" }),
    });

    expect(requireRole).toHaveBeenCalledWith("admin", "superadmin");
    expect(listExpedientesPanel).toHaveBeenCalledWith(usuario, {
      estado: "EN_REVISION",
      q: "EXP",
      page: 2,
    });
    expect(element.props.resultado).toBe(resultado);
  });

  it("sanea los filtros inválidos de la URL", async () => {
    requireRole.mockResolvedValue({ id: "u1", rol: "admin" });
    listExpedientesPanel.mockResolvedValue({});

    await BandejaPage({
      searchParams: Promise.resolve({ estado: "BORRADOR", page: "0", q: ["a", "b"] }),
    });

    expect(listExpedientesPanel).toHaveBeenCalledWith(expect.anything(), {
      estado: undefined,
      q: undefined,
      page: 1,
    });
  });

  it("si requireRole redirige no consulta el servicio", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(BandejaPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    expect(listExpedientesPanel).not.toHaveBeenCalled();
  });
});
