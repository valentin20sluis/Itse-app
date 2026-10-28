import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
const listCertificadosPanel = vi.hoisted(() => vi.fn());

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("@/modules/certificados/services/certificado-lista.service", () => ({ listCertificadosPanel }));
vi.mock("@/modules/certificados/components/CertificadosPanelView", () => ({ CertificadosPanelView: () => null }));

import CertificadosPanelPage from "./page";

describe("/panel/certificados", () => {
  beforeEach(() => vi.resetAllMocks());

  it("exige admin o superadmin y pasa el filtro al servicio", async () => {
    const usuario = { id: "u1", rol: "admin" };
    const filas = [{ numero: "0001-2026" }];
    requireRole.mockResolvedValue(usuario);
    listCertificadosPanel.mockResolvedValue(filas);

    const element = await CertificadosPanelPage({ searchParams: Promise.resolve({ filtro: "por-vencer" }) });

    expect(requireRole).toHaveBeenCalledWith("admin", "superadmin");
    expect(listCertificadosPanel).toHaveBeenCalledWith(usuario, "por-vencer");
    expect(element.props.filas).toBe(filas);
    expect(element.props.filtro).toBe("por-vencer");
  });

  it("un filtro desconocido equivale a todos", async () => {
    requireRole.mockResolvedValue({ id: "u1", rol: "superadmin" });
    listCertificadosPanel.mockResolvedValue([]);

    await CertificadosPanelPage({ searchParams: Promise.resolve({ filtro: "xyz" }) });

    expect(listCertificadosPanel).toHaveBeenCalledWith(expect.anything(), "todos");
  });

  it("si requireRole redirige no consulta el servicio", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(CertificadosPanelPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    expect(listCertificadosPanel).not.toHaveBeenCalled();
  });
});
