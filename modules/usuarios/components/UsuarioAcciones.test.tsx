import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ cambiarRolAction: vi.fn(), setUsuarioActivoAction: vi.fn() }));

vi.mock("@/modules/usuarios/actions/usuario.actions", () => h);

import { UsuarioAcciones } from "./UsuarioAcciones";

const base = { id: "u1", nombre: "Ana Quispe", rol: "admin" as const, activo: true, esActual: false };

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("UsuarioAcciones", () => {
  it("esActual deshabilita los botones y muestra el aviso", () => {
    render(<UsuarioAcciones usuario={{ ...base, esActual: true }} />);
    expect(screen.getByRole("button", { name: "Cambiar rol de Ana Quispe" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Desactivar a Ana Quispe" })).toBeDisabled();
    expect(screen.getByText("No puedes modificar tu propia cuenta")).toBeInTheDocument();
  });

  it("desactivar exige confirmar antes de llamar a la acción", async () => {
    h.setUsuarioActivoAction.mockResolvedValue({ ok: true, data: {} });
    render(<UsuarioAcciones usuario={base} />);
    fireEvent.click(screen.getByRole("button", { name: "Desactivar a Ana Quispe" }));
    expect(h.setUsuarioActivoAction).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Desactivar" }));
    await waitFor(() => expect(h.setUsuarioActivoAction).toHaveBeenCalledWith("u1", false));
  });

  it("el error se muestra en role=alert y el diálogo sigue abierto", async () => {
    h.setUsuarioActivoAction.mockResolvedValue({ ok: false, error: "Debe quedar al menos un jefe activo." });
    render(<UsuarioAcciones usuario={base} />);
    fireEvent.click(screen.getByRole("button", { name: "Desactivar a Ana Quispe" }));
    fireEvent.click(await screen.findByRole("button", { name: "Desactivar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Debe quedar al menos un jefe activo.");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("reactivar llama directo a la acción", async () => {
    h.setUsuarioActivoAction.mockResolvedValue({ ok: true, data: {} });
    render(<UsuarioAcciones usuario={{ ...base, activo: false }} />);
    fireEvent.click(screen.getByRole("button", { name: "Reactivar a Ana Quispe" }));
    await waitFor(() => expect(h.setUsuarioActivoAction).toHaveBeenCalledWith("u1", true));
  });

  it("cambiar rol no permite confirmar el rol actual", async () => {
    h.cambiarRolAction.mockResolvedValue({ ok: true, data: {} });
    render(<UsuarioAcciones usuario={base} />);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar rol de Ana Quispe" }));
    const confirmar = await screen.findByRole("button", { name: "Cambiar rol" });
    expect(confirmar).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Admin/ })).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: /Cliente/ }));
    expect(confirmar).toBeEnabled();
    fireEvent.click(confirmar);
    await waitFor(() => expect(h.cambiarRolAction).toHaveBeenCalledWith("u1", "cliente"));
  });
});
