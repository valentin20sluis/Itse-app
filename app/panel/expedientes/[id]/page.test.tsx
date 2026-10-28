import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
const getExpedienteDetalle = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("@/modules/expedientes/services/bandeja.service", () => ({ getExpedienteDetalle }));
vi.mock("@/modules/inspecciones/components/PanelInspeccion", () => ({ PanelInspeccion: () => null }));
vi.mock("@/modules/certificados/components/PanelCertificado", () => ({ PanelCertificado: () => null }));
const PanelResolucionNoCumple = vi.hoisted(() => vi.fn(() => null));
vi.mock("@/modules/certificados/components/PanelResolucionNoCumple", () => ({ PanelResolucionNoCumple }));
vi.mock("@/modules/expedientes/components/AccionesExpediente", () => ({ AccionesExpediente: () => null }));
vi.mock("@/modules/expedientes/components/ExpedienteDatos", () => ({ ExpedienteDatos: () => null }));
vi.mock("@/modules/expedientes/components/HistorialTimeline", () => ({ HistorialTimeline: () => null }));
vi.mock("@/modules/expedientes/components/EstadoBadge", () => ({ EstadoBadge: () => null }));

import ExpedienteDetallePage from "./page";

const ID = "3f1c2a4e-5b6d-4e7f-8a9b-0c1d2e3f4a5b";
const props = (id: string) => ({ params: Promise.resolve({ id }) });

describe("/panel/expedientes/[id]", () => {
  beforeEach(() => vi.resetAllMocks());

  it("exige admin o superadmin y pasa el usuario al servicio", async () => {
    const usuario = { id: "u1", rol: "superadmin" };
    requireRole.mockResolvedValue(usuario);
    getExpedienteDetalle.mockResolvedValue({
      expediente: { id: ID, numero: "EXP-2026-00001", estado: "PRESENTADO", nivelRiesgo: "BAJO" },
      historial: [],
    });

    await ExpedienteDetallePage(props(ID));

    expect(requireRole).toHaveBeenCalledWith("admin", "superadmin");
    expect(getExpedienteDetalle).toHaveBeenCalledWith(usuario, ID);
  });

  it("renderiza PanelResolucionNoCumple con usuario, expedienteId y estado", async () => {
    const usuario = { id: "u1", rol: "admin" };
    requireRole.mockResolvedValue(usuario);
    getExpedienteDetalle.mockResolvedValue({
      expediente: { id: ID, numero: "EXP-2026-00001", estado: "NO_CUMPLE", nivelRiesgo: "BAJO" },
      historial: [],
    });

    const arbol = await ExpedienteDetallePage(props(ID));

    const buscar = (nodo: unknown): { props: Record<string, unknown> } | null => {
      if (Array.isArray(nodo)) return nodo.map(buscar).find(Boolean) ?? null;
      if (!nodo || typeof nodo !== "object" || !("props" in nodo)) return null;
      const el = nodo as { type: unknown; props: { children?: unknown } & Record<string, unknown> };
      return el.type === PanelResolucionNoCumple ? el : buscar(el.props.children);
    };
    expect(buscar(arbol)?.props).toEqual({ usuario, expedienteId: ID, estado: "NO_CUMPLE" });
  });

  it("id que no es uuid llama notFound sin consultar", async () => {
    requireRole.mockResolvedValue({ id: "u1", rol: "admin" });
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(ExpedienteDetallePage(props("abc"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getExpedienteDetalle).not.toHaveBeenCalled();
  });

  it("detalle null llama notFound", async () => {
    requireRole.mockResolvedValue({ id: "u1", rol: "admin" });
    getExpedienteDetalle.mockResolvedValue(null);
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(ExpedienteDetallePage(props(ID))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("si requireRole redirige no consulta el servicio", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(ExpedienteDetallePage(props(ID))).rejects.toThrow("NEXT_REDIRECT");
    expect(getExpedienteDetalle).not.toHaveBeenCalled();
  });
});
