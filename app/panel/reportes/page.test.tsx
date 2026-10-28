import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
const getReporte = vi.hoisted(() => vi.fn());

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("@/modules/reportes/services/reportes.service", () => ({ getReporte }));

import ReportesPage from "./page";
import { rangoDesdeHasta } from "@/modules/reportes/utils/rango-fechas";

describe("/panel/reportes", () => {
  beforeEach(() => vi.resetAllMocks());

  it("exige admin o superadmin y pasa usuario y filtros al servicio", async () => {
    const usuario = { id: "u1", rol: "admin" };
    const reporte = { produccion: [] };
    requireRole.mockResolvedValue(usuario);
    getReporte.mockResolvedValue(reporte);

    const element = await ReportesPage({
      searchParams: Promise.resolve({ desde: "2026-01-01", hasta: "2026-02-01", estado: "CUMPLE", distrito: " Surco " }),
    });

    expect(requireRole).toHaveBeenCalledWith("admin", "superadmin");
    expect(getReporte).toHaveBeenCalledWith(usuario, {
      desde: "2026-01-01",
      hasta: "2026-02-01",
      estado: "CUMPLE",
      riesgo: undefined,
      distrito: "Surco",
    });
    expect(element.props.reporte).toBe(reporte);
  });

  it("los filtros inválidos usan los valores por defecto", async () => {
    requireRole.mockResolvedValue({ id: "u1", rol: "admin" });
    getReporte.mockResolvedValue({});
    const r = rangoDesdeHasta();

    await ReportesPage({ searchParams: Promise.resolve({ desde: "ayer", estado: "BORRADOR", riesgo: ["A", "B"] }) });

    expect(getReporte).toHaveBeenCalledWith(expect.anything(), {
      desde: r.desdeInput,
      hasta: r.hastaInput,
      estado: undefined,
      riesgo: undefined,
      distrito: undefined,
    });
  });

  it("una cohorte vacía muestra el estado vacío y deja el formulario", async () => {
    requireRole.mockResolvedValue({ id: "u1", rol: "admin" });
    getReporte.mockResolvedValue({
      produccion: [{ clave: "2026-01", cantidad: 0 }],
      porRiesgo: [],
      porTramite: [],
      resultados: { cumple: 0, noCumple: 0, subsanacion: 0 },
      tiempos: [],
      tiempoEntrega: null,
      certificados: { emitidos: 0, vencimiento: { vencidos: 0, hasta30: 0, de31a60: 0, vigentes: 0 } },
      distritos: ["Surco"],
    });
    render(await ReportesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("No hay expedientes con estos filtros.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Aplicar filtros" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Descargar CSV" })).toBeTruthy();
  });

  it("si requireRole redirige no consulta el servicio", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(ReportesPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    expect(getReporte).not.toHaveBeenCalled();
  });
});
