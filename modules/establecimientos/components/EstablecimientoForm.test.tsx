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
  razonSocial: "Bodega Don Pepe SAC",
  ruc: "20123456789",
  nombreComercial: "Bodega Don Pepe",
  direccion: "Av. Lima 123",
  distrito: "Miraflores",
  numeroGiro: "G-123",
  funcion: "COMERCIO",
  giro: "Bodega",
  areaM2: "120.50",
  numeroPisos: 2,
  pisoEstablecimiento: 1,
  archivadoAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Establecimiento;

afterEach(cleanup);

describe("EstablecimientoForm", () => {
  it("renderiza los 9 campos con su label en el orden esperado", () => {
    render(<EstablecimientoForm open onOpenChange={() => {}} />);
    const labels = [
      "Nombre comercial",
      "Dirección",
      "Distrito",
      "Número de giro",
      "Giro o actividad",
      "Función",
      "Área techada total (m²)",
      "Número de pisos de la edificación",
      "Piso donde está el establecimiento",
    ];
    const els = labels.map((l) => screen.getByLabelText(l));
    els.forEach((el, i) => {
      if (i > 0) {
        expect(els[i - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    });
    expect(screen.getByLabelText("Número de pisos de la edificación")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText("Piso donde está el establecimiento")).toHaveAttribute("inputmode", "numeric");
  });

  it("en una fila vieja el piso del establecimiento parte vacío", () => {
    render(
      <EstablecimientoForm
        open
        onOpenChange={() => {}}
        establecimiento={{ ...existente, pisoEstablecimiento: null }}
      />,
    );
    expect(screen.getByLabelText("Piso donde está el establecimiento")).toHaveValue("");
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
    expect(screen.getByLabelText("Número de pisos de la edificación")).toHaveValue("2");
    expect(screen.getByLabelText("Piso donde está el establecimiento")).toHaveValue("1");
    expect(screen.getByLabelText("Número de giro")).toHaveValue("G-123");
    expect(screen.getByLabelText("Función")).toHaveValue("COMERCIO");
  });

  it("el campo de camas aparece solo con Hospedaje y se precarga al editar", () => {
    const { unmount } = render(<EstablecimientoForm open onOpenChange={() => {}} establecimiento={existente} />);
    expect(screen.queryByLabelText("Número de camas o habitaciones")).toBeNull();
    fireEvent.change(screen.getByLabelText("Función"), { target: { value: "HOSPEDAJE" } });
    expect(screen.getByLabelText("Número de camas o habitaciones")).toHaveAttribute("inputmode", "numeric");
    unmount();
    render(
      <EstablecimientoForm
        open
        onOpenChange={() => {}}
        establecimiento={{ ...existente, funcion: "HOSPEDAJE", numeroCamas: 30 }}
      />,
    );
    expect(screen.getByLabelText("Número de camas o habitaciones")).toHaveValue("30");
  });

  it("muestra el error de camas asociado al campo y conserva el valor", async () => {
    updateMock.mockResolvedValue({
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: { numeroCamas: ["Ingresa el número de camas o habitaciones."] },
    });
    render(<EstablecimientoForm open onOpenChange={() => {}} establecimiento={{ ...existente, funcion: "HOSPEDAJE" }} />);
    fireEvent.change(screen.getByLabelText("Número de camas o habitaciones"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    const input = await screen.findByLabelText("Número de camas o habitaciones");
    const mensaje = await screen.findByText("Ingresa el número de camas o habitaciones.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toBe(mensaje.id);
    expect(input).toHaveValue("0");
  });

  it("la función ofrece las 8 opciones con etiqueta y parte vacía en filas viejas", () => {
    render(
      <EstablecimientoForm
        open
        onOpenChange={() => {}}
        establecimiento={{ ...existente, funcion: null }}
      />,
    );
    const select = screen.getByLabelText("Función");
    expect(select).toHaveValue("");
    expect(screen.getByRole("option", { name: "Selecciona una función" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Oficinas administrativas" })).toHaveValue(
      "OFICINAS_ADMINISTRATIVAS",
    );
    expect(select.querySelectorAll("option")).toHaveLength(9);
  });
});
