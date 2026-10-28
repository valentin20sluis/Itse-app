import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
const listCertificadosCliente = vi.hoisted(() => vi.fn());
const listResolucionesNoCumpleCliente = vi.hoisted(() => vi.fn());

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("@/modules/certificados/services/certificado-lista.service", () => ({
  listCertificadosCliente,
  listResolucionesNoCumpleCliente,
}));
vi.mock("@/modules/certificados/components/CertificadosClienteView", () => ({ CertificadosClienteView: () => null }));

import MisCertificadosPage from "./page";

describe("/mi-cuenta/certificados", () => {
  beforeEach(() => vi.resetAllMocks());

  it("exige cliente y consulta con el usuario devuelto", async () => {
    const usuario = { id: "u1", rol: "cliente" };
    const filas = [{ numero: "0001-2026" }];
    const resoluciones = [{ expedienteId: "e1" }];
    requireRole.mockResolvedValue(usuario);
    listResolucionesNoCumpleCliente.mockResolvedValue(resoluciones);
    listCertificadosCliente.mockResolvedValue(filas);

    const element = await MisCertificadosPage();

    expect(requireRole).toHaveBeenCalledWith("cliente");
    expect(listCertificadosCliente).toHaveBeenCalledWith(usuario);
    expect(listResolucionesNoCumpleCliente).toHaveBeenCalledWith(usuario);
    expect(element.props.filas).toBe(filas);
    expect(element.props.resoluciones).toBe(resoluciones);
  });

  it("si requireRole redirige no consulta el servicio", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(MisCertificadosPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(listCertificadosCliente).not.toHaveBeenCalled();
  });
});
