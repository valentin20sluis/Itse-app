import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
const getExpedienteDetalle = vi.hoisted(() => vi.fn());
const getResumenInspeccion = vi.hoisted(() => vi.fn());
const getResumenSubsanacion = vi.hoisted(() => vi.fn());
const getResumenCertificado = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("@/modules/expedientes/services/bandeja.service", () => ({ getExpedienteDetalle }));
vi.mock("@/modules/inspecciones/services/designacion.service", () => ({ getResumenInspeccion }));
vi.mock("@/modules/inspecciones/services/diligencia.service", () => ({ getResumenSubsanacion }));
vi.mock("@/modules/certificados/services/certificado.service", () => ({ getResumenCertificado }));
vi.mock("@/modules/expedientes/components/ExpedienteDetalleCliente", () => ({
  ExpedienteDetalleCliente: () => null,
}));

import ExpedienteDetallePage from "./page";

const ID = "3f1c2b7e-9a4d-4e0b-8c55-1d2e3f4a5b6c";
const params = (id: string) => Promise.resolve({ id });

describe("/mi-cuenta/expedientes/[id]", () => {
  beforeEach(() => vi.resetAllMocks());

  it("exige cliente y consulta con el usuario devuelto", async () => {
    const usuario = { id: "u1" };
    const detalle = { expediente: { id: ID } };
    requireRole.mockResolvedValue(usuario);
    getExpedienteDetalle.mockResolvedValue(detalle);
    getResumenInspeccion.mockResolvedValue({ total: 2 });
    getResumenSubsanacion.mockResolvedValue({ tipoItse: "POSTERIOR", limite: null, observaciones: [] });

    getResumenCertificado.mockResolvedValue({ numero: "0001-2026" });

    const element = await ExpedienteDetallePage({ params: params(ID) });

    expect(getResumenCertificado).toHaveBeenCalledWith(usuario, ID);
    expect(element.props.certificado).toEqual({ numero: "0001-2026" });
    expect(requireRole).toHaveBeenCalledWith("cliente");
    expect(getExpedienteDetalle).toHaveBeenCalledWith(usuario, ID);
    expect(getResumenInspeccion).toHaveBeenCalledWith(usuario, ID);
    expect(element.props.detalle).toBe(detalle);
    expect(getResumenSubsanacion).toHaveBeenCalledWith(usuario, ID);
    expect(element.props.inspeccion).toEqual({ total: 2 });
    expect(element.props.subsanacion).toEqual({ tipoItse: "POSTERIOR", limite: null, observaciones: [] });
  });

  it("si requireRole redirige no consulta el servicio", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(ExpedienteDetallePage({ params: params(ID) })).rejects.toThrow("NEXT_REDIRECT");
    expect(getExpedienteDetalle).not.toHaveBeenCalled();
  });

  it("id no uuid: notFound sin llamar al servicio", async () => {
    requireRole.mockResolvedValue({ id: "u1" });
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(ExpedienteDetallePage({ params: params("abc") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getExpedienteDetalle).not.toHaveBeenCalled();
  });

  it("servicio null: notFound", async () => {
    requireRole.mockResolvedValue({ id: "u1" });
    getExpedienteDetalle.mockResolvedValue(null);
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(ExpedienteDetallePage({ params: params(ID) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
    expect(getResumenInspeccion).not.toHaveBeenCalled();
    expect(getResumenSubsanacion).not.toHaveBeenCalled();
  });
});
