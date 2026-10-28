import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  crearFeriadoAction: vi.fn(),
  editarFeriadoAction: vi.fn(),
  eliminarFeriadoAction: vi.fn(),
}));
vi.mock("@/modules/configuracion/actions/feriado.actions", () => m);

import { FeriadosView } from "./FeriadosView";

const feriados = [
  { fecha: "2026-12-25", nombre: "Navidad" },
  { fecha: "2027-01-01", nombre: "Año Nuevo" },
];

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("FeriadosView", () => {
  it("agrupa por año con un encabezado por año", () => {
    render(<FeriadosView feriados={feriados} historial={[]} />);
    expect(screen.getByRole("heading", { name: "2026" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2027" })).toBeInTheDocument();
  });

  it("sin feriados muestra el estado vacío y sin cambios el historial vacío", () => {
    render(<FeriadosView feriados={[]} historial={[]} />);
    expect(screen.getByText("Aún no hay feriados")).toBeInTheDocument();
    expect(screen.getByText("Aún no hay cambios.")).toBeInTheDocument();
  });

  it("muestra el historial con persona, fecha y texto", () => {
    render(
      <FeriadosView
        feriados={feriados}
        historial={[
          {
            id: "1",
            accion: "CREAR",
            referencia: "2026-12-25",
            valorAnterior: null,
            valorNuevo: "Navidad",
            actorNombre: "Ana Soto",
            createdAt: new Date("2026-10-28T15:30:00Z"),
          },
        ]}
      />,
    );
    expect(screen.getByText("Agregó el feriado “Navidad” (25/12/2026)")).toBeInTheDocument();
    expect(screen.getByText("Ana Soto · 28/10/2026 10:30")).toBeInTheDocument();
  });

  it("eliminar exige confirmar antes de llamar a la acción", async () => {
    m.eliminarFeriadoAction.mockResolvedValue({ ok: true, data: feriados[0] });
    render(<FeriadosView feriados={feriados} historial={[]} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Eliminar el feriado Navidad" })[0]);
    const dialogo = await screen.findByRole("alertdialog");
    expect(m.eliminarFeriadoAction).not.toHaveBeenCalled();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(m.eliminarFeriadoAction).toHaveBeenCalledWith("2026-12-25"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("si eliminar falla muestra el error en role=alert y el diálogo sigue abierto", async () => {
    m.eliminarFeriadoAction.mockResolvedValue({ ok: false, error: "No se encontró el feriado." });
    render(<FeriadosView feriados={feriados} historial={[]} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Eliminar el feriado Navidad" })[0]);
    const dialogo = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Eliminar" }));
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent("No se encontró el feriado.");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("agregar: error por campo asociado al input y el diálogo no se cierra", async () => {
    m.crearFeriadoAction.mockResolvedValue({
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: { nombre: ["El nombre debe tener al menos 3 caracteres."] },
    });
    render(<FeriadosView feriados={feriados} historial={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar feriado" }));
    const fecha = await screen.findByLabelText("Fecha");
    expect(fecha).toHaveAttribute("type", "date");
    fireEvent.change(fecha, { target: { value: "2026-10-30" } });
    fireEvent.change(screen.getByLabelText("Nombre del feriado"), { target: { value: "ab" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    const mensaje = await screen.findByText("El nombre debe tener al menos 3 caracteres.");
    expect(screen.getByLabelText("Nombre del feriado")).toHaveAttribute("aria-describedby", mensaje.id);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("agregar: error general en role=alert", async () => {
    m.crearFeriadoAction.mockResolvedValue({ ok: false, error: "Ya existe un feriado en esa fecha." });
    render(<FeriadosView feriados={feriados} historial={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar feriado" }));
    fireEvent.change(await screen.findByLabelText("Fecha"), { target: { value: "2026-12-25" } });
    fireEvent.change(screen.getByLabelText("Nombre del feriado"), { target: { value: "Navidad" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ya existe un feriado en esa fecha.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("cambiar nombre: la fecha es de solo lectura y se envía la fecha original", async () => {
    m.editarFeriadoAction.mockResolvedValue({ ok: true, data: feriados[0] });
    render(<FeriadosView feriados={feriados} historial={[]} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Cambiar nombre del feriado Navidad" })[0]);
    expect(await screen.findByLabelText("Fecha")).toHaveAttribute("readonly");
    fireEvent.change(screen.getByLabelText("Nombre del feriado"), { target: { value: "Navidad del Señor" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(m.editarFeriadoAction).toHaveBeenCalled());
    expect(m.editarFeriadoAction.mock.calls[0][0]).toBe("2026-12-25");
    expect((m.editarFeriadoAction.mock.calls[0][1] as FormData).get("nombre")).toBe("Navidad del Señor");
  });
});
