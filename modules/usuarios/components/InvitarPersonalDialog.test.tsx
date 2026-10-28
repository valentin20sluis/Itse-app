import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const invitarPersonalAction = vi.hoisted(() => vi.fn());
vi.mock("@/modules/usuarios/actions/usuario.actions", () => ({ invitarPersonalAction }));

import { InvitarPersonalDialog } from "./InvitarPersonalDialog";

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

async function abrirYEnviar(correo = "ana@muni.pe") {
  render(<InvitarPersonalDialog />);
  fireEvent.click(screen.getByRole("button", { name: "Invitar personal" }));
  const campo = await screen.findByLabelText("Correo electrónico");
  fireEvent.change(campo, { target: { value: correo } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar invitación" }));
  return campo;
}

describe("InvitarPersonalDialog", () => {
  it("el campo tiene label accesible, es de correo y sin autocompletar", async () => {
    render(<InvitarPersonalDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Invitar personal" }));
    const campo = await screen.findByLabelText("Correo electrónico");
    expect(campo).toHaveAttribute("type", "email");
    expect(campo).toHaveAttribute("autocomplete", "off");
  });

  it("muestra el error de campo", async () => {
    invitarPersonalAction.mockResolvedValue({
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: { email: ["Escribe un correo válido."] },
    });
    await abrirYEnviar("mal");
    expect(await screen.findByText("Escribe un correo válido.")).toBeInTheDocument();
  });

  it("muestra el error general en role=alert", async () => {
    invitarPersonalAction.mockResolvedValue({ ok: false, error: "No se pudo enviar la invitación. Inténtalo de nuevo." });
    await abrirYEnviar();
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo enviar la invitación");
  });

  it("éxito muestra el mensaje con el correo", async () => {
    invitarPersonalAction.mockResolvedValue({ ok: true, data: { email: "ana@muni.pe" } });
    await abrirYEnviar();
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Invitación enviada a ana@muni.pe."),
    );
  });
});
