import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";

const { createMock, updateMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/modules/establecimientos/actions/establecimiento.actions", () => ({
  createEstablecimientoAction: createMock,
  updateEstablecimientoAction: updateMock,
}));

import { EstablecimientoForm } from "@/modules/establecimientos/components/EstablecimientoForm";

const existente = {
  id: "8b1f6c1e-3b0a-4f5e-9a55-0d6b6d1c9a11",
  usuarioId: "u1",
  nombreComercial: "Bodega Don Pepe",
  direccion: "Av. Lima 123",
  distrito: "Miraflores",
  giro: "Bodega",
  areaM2: "120.50",
  numeroPisos: 2,
  archivadoAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Establecimiento;

afterEach(cleanup);

describe("EstablecimientoForm", () => {
  it("renderiza los 6 campos con su label", () => {
    render(<EstablecimientoForm open onOpenChange={() => {}} />);
    for (const label of [
      "Nombre comercial",
      "Dirección",
      "Distrito",
      "Giro o actividad",
      "Área techada total (m²)",
      "Número de pisos",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("muestra los errores por campo con aria-invalid", async () => {
    createMock.mockResolvedValue({
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: { nombreComercial: ["Ingresa el nombre comercial."] },
    });
    render(<EstablecimientoForm open onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("Nombre comercial"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    const input = await screen.findByLabelText("Nombre comercial");
    const mensaje = await screen.findByText("Ingresa el nombre comercial.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toBe(mensaje.id);
    expect(input).toHaveValue("x");
  });

  it("precarga los valores al editar", () => {
    render(<EstablecimientoForm open onOpenChange={() => {}} establecimiento={existente} />);
    expect(screen.getByLabelText("Nombre comercial")).toHaveValue("Bodega Don Pepe");
    expect(screen.getByLabelText("Área techada total (m²)")).toHaveValue("120.50");
    expect(screen.getByLabelText("Número de pisos")).toHaveValue("2");
  });
});
