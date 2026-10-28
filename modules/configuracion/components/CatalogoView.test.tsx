import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  crearObservacionAction: vi.fn(),
  editarObservacionAction: vi.fn(),
  setObservacionActivaAction: vi.fn(),
}));
vi.mock("@/modules/configuracion/actions/catalogo.actions", () => m);

import { CatalogoView } from "./CatalogoView";

const activa = { id: "id-1", descripcion: "Instalar extintores", activo: true };
const inactiva = { id: "id-2", descripcion: "Colocar señalización", activo: false };

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("CatalogoView", () => {
  it("lista descripción, estado y acciones; no muestra códigos", () => {
    render(<CatalogoView items={[activa, inactiva]} historial={[]} />);
    expect(screen.getAllByText("Activa").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Desactivada").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Editar la observación Instalar extintores" })).not.toHaveLength(0);
    expect(screen.getAllByRole("button", { name: "Desactivar la observación Instalar extintores" })).not.toHaveLength(0);
    expect(screen.getAllByRole("button", { name: "Reactivar la observación Colocar señalización" })).not.toHaveLength(0);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("sin activas muestra el aviso", () => {
    render(<CatalogoView items={[inactiva]} historial={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Sin observaciones activas, en ITSE posterior toda observación se considerará relevante.",
    );
  });

  it("sin observaciones muestra el estado vacío", () => {
    render(<CatalogoView items={[]} historial={[]} />);
    expect(screen.getByText("Aún no hay observaciones")).toBeInTheDocument();
  });

  it("muestra el historial de observaciones", () => {
    render(
      <CatalogoView
        items={[activa]}
        historial={[
          {
            id: "1",
            accion: "DESACTIVAR",
            referencia: "EXTINTORES",
            valorAnterior: "Instalar extintores",
            valorNuevo: "Instalar extintores",
            actorNombre: "Ana Soto",
            createdAt: new Date("2026-10-28T15:30:00Z"),
          },
        ]}
      />,
    );
    expect(screen.getByText("Desactivó la observación “Instalar extintores”")).toBeInTheDocument();
  });

  it("desactivar exige confirmar antes de llamar a la acción", async () => {
    m.setObservacionActivaAction.mockResolvedValue({ ok: true, data: { ...activa, activo: false } });
    render(<CatalogoView items={[activa]} historial={[]} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Desactivar la observación Instalar extintores" })[0]);
    const dialogo = await screen.findByRole("alertdialog");
    expect(m.setObservacionActivaAction).not.toHaveBeenCalled();
    expect(dialogo).toHaveTextContent(
      "Dejará de ofrecerse en nuevas diligencias. Los expedientes que ya la tienen no cambian.",
    );
    fireEvent.click(within(dialogo).getByRole("button", { name: "Desactivar" }));
    await waitFor(() => expect(m.setObservacionActivaAction).toHaveBeenCalledWith("id-1", false));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("si desactivar falla muestra el error en role=alert y el diálogo sigue abierto", async () => {
    m.setObservacionActivaAction.mockResolvedValue({ ok: false, error: "No se encontró la observación." });
    render(<CatalogoView items={[activa]} historial={[]} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Desactivar la observación Instalar extintores" })[0]);
    const dialogo = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Desactivar" }));
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent("No se encontró la observación.");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("reactivar llama directo a la acción, sin confirmar", async () => {
    m.setObservacionActivaAction.mockResolvedValue({ ok: true, data: { ...inactiva, activo: true } });
    render(<CatalogoView items={[inactiva]} historial={[]} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Reactivar la observación Colocar señalización" })[0]);
    await waitFor(() => expect(m.setObservacionActivaAction).toHaveBeenCalledWith("id-2", true));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("agregar: error por campo asociado al textarea y el diálogo no se cierra", async () => {
    m.crearObservacionAction.mockResolvedValue({
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: { descripcion: ["La descripción debe tener al menos 10 caracteres."] },
    });
    render(<CatalogoView items={[activa]} historial={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar observación" }));
    fireEvent.change(await screen.findByLabelText("Descripción de la observación"), { target: { value: "corta" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    const mensaje = await screen.findByText("La descripción debe tener al menos 10 caracteres.");
    expect(screen.getByLabelText("Descripción de la observación")).toHaveAttribute("aria-describedby", mensaje.id);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("agregar: error general en role=alert con el diálogo abierto", async () => {
    m.crearObservacionAction.mockResolvedValue({
      ok: false,
      error: "Ya existe una observación con esa descripción.",
    });
    render(<CatalogoView items={[activa]} historial={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar observación" }));
    fireEvent.change(await screen.findByLabelText("Descripción de la observación"), {
      target: { value: "Instalar extintores" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ya existe una observación con esa descripción.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("editar: se envía el id y la nueva descripción", async () => {
    m.editarObservacionAction.mockResolvedValue({ ok: true, data: activa });
    render(<CatalogoView items={[activa]} historial={[]} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Editar la observación Instalar extintores" })[0]);
    fireEvent.change(await screen.findByLabelText("Descripción de la observación"), {
      target: { value: "Instalar o recargar extintores" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(m.editarObservacionAction).toHaveBeenCalled());
    expect(m.editarObservacionAction.mock.calls[0][0]).toBe("id-1");
    expect((m.editarObservacionAction.mock.calls[0][1] as FormData).get("descripcion")).toBe(
      "Instalar o recargar extintores",
    );
  });
});
