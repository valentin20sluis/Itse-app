import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
const getDashboardPanel = vi.hoisted(() => vi.fn());

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("@/modules/reportes/services/dashboard.service", () => ({ getDashboardPanel }));
vi.mock("@/components/shared/BarsChart", () => ({ BarsChart: () => null }));

import PanelPage from "./page";

const vacio = {
  indicadores: {
    porRevisar: 0,
    enRevision: 0,
    pendientesJefatura: 0,
    inspeccionesSemana: 0,
    subsanacionPorVencer: 0,
    certificadosPorVencer: 0,
  },
  porEstado: [],
  porMes: [],
  certificados: { vencidos: 0, hasta30: 0, de31a60: 0, vigentes: 0 },
};

describe("/panel", () => {
  beforeEach(() => vi.resetAllMocks());

  it("exige admin o superadmin antes de consultar y pasa el usuario al servicio", async () => {
    const usuario = { id: "u1", rol: "admin" };
    requireRole.mockResolvedValue(usuario);
    getDashboardPanel.mockResolvedValue(vacio);

    await PanelPage();

    expect(requireRole).toHaveBeenCalledWith("admin", "superadmin");
    expect(getDashboardPanel).toHaveBeenCalledWith(usuario);
    expect(requireRole.mock.invocationCallOrder[0]).toBeLessThan(getDashboardPanel.mock.invocationCallOrder[0]);
  });

  it("con todo en cero muestra los indicadores en 0 y el estado vacío", async () => {
    requireRole.mockResolvedValue({ id: "u1", rol: "admin" });
    getDashboardPanel.mockResolvedValue(vacio);

    render(await PanelPage());

    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getAllByText("0")).toHaveLength(6);
    expect(screen.getByText("Aún no hay expedientes presentados.")).toBeTruthy();
    expect(screen.queryByText("Expedientes por estado")).toBeNull();
  });

  it("si requireRole redirige no consulta el servicio", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(PanelPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(getDashboardPanel).not.toHaveBeenCalled();
  });
});
