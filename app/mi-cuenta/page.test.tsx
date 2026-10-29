import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

const requireRole = vi.hoisted(() => vi.fn());
const getInicioCliente = vi.hoisted(() => vi.fn());

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("@/modules/client-area/services/inicio.service", () => ({ getInicioCliente }));
vi.mock("@/modules/client-area/components/InicioClienteView", () => ({
  InicioClienteView: () => null,
}));

import MiCuentaPage from "./page";

describe("/mi-cuenta", () => {
  beforeEach(() => vi.resetAllMocks());

  it("exige cliente antes de leer y pasa el usuario devuelto al servicio", async () => {
    const usuario = { id: "u1", rol: "cliente", nombres: "Ana", email: "ana@ejemplo.pe" };
    const inicio = { pasos: [] };
    requireRole.mockResolvedValue(usuario);
    getInicioCliente.mockResolvedValue(inicio);

    const element = await MiCuentaPage();

    expect(requireRole).toHaveBeenCalledWith("cliente");
    expect(requireRole.mock.invocationCallOrder[0]).toBeLessThan(getInicioCliente.mock.invocationCallOrder[0]);
    expect(getInicioCliente).toHaveBeenCalledWith(usuario);
    expect(element.props.inicio).toBe(inicio);
    expect(element.props.saludo).toBe("Ana");
  });

  it("sin nombres saluda con el correo", async () => {
    requireRole.mockResolvedValue({ id: "u1", rol: "cliente", nombres: "  ", email: "ana@ejemplo.pe" });
    getInicioCliente.mockResolvedValue({});

    const element = await MiCuentaPage();

    expect(element.props.saludo).toBe("ana@ejemplo.pe");
  });

  it("si requireRole redirige no consulta el servicio", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(MiCuentaPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(getInicioCliente).not.toHaveBeenCalled();
  });
});
