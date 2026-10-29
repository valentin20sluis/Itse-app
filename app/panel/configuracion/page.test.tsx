import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));

import { DIAS_ALERTA_VENCIMIENTO, VIGENCIA_ANIOS } from "@/modules/certificados/utils/vigencia";
import ConfiguracionPage from "./page";

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("/panel/configuracion", () => {
  it("exige superadmin", async () => {
    requireRole.mockResolvedValue({ id: "s1", rol: "superadmin" });
    await ConfiguracionPage();
    expect(requireRole).toHaveBeenCalledWith("superadmin");
  });

  it("si requireRole redirige, no devuelve la vista", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(ConfiguracionPage()).rejects.toThrow("NEXT_REDIRECT");
  });

  it("muestra las tarjetas de feriados, catálogo y tasa con su enlace y las reglas fijas con los valores de las constantes", async () => {
    requireRole.mockResolvedValue({ id: "s1", rol: "superadmin" });
    render(await ConfiguracionPage());
    expect(screen.getByRole("link", { name: /Feriados/ })).toHaveAttribute("href", "/panel/configuracion/feriados");
    expect(screen.getByRole("link", { name: /Catálogo de observaciones/ })).toHaveAttribute(
      "href",
      "/panel/configuracion/catalogo",
    );
    expect(screen.getByRole("link", { name: /Tasa de pago/ })).toHaveAttribute("href", "/panel/configuracion/tasas");
    expect(screen.getByText("Reglas fijas por norma")).toBeInTheDocument();
    expect(screen.getByText(`${VIGENCIA_ANIOS} años`)).toBeInTheDocument();
    expect(screen.getByText(/3 días hábiles en ITSE posterior y 20 en ITSE previa/)).toBeInTheDocument();
    expect(screen.getByText(`${DIAS_ALERTA_VENCIMIENTO} días antes del vencimiento`)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
