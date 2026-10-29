import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ guardarTasasAction: vi.fn() }));
vi.mock("@/modules/configuracion/actions/tasa.actions", () => m);

import { TasasForm } from "./TasasForm";

const tasas = { POSTERIOR: 15000, PREVIA: 30000 };
const POSTERIOR = "Riesgo bajo y medio (ITSE posterior)";
const PREVIA = "Riesgo alto y muy alto (ITSE previa)";

const guardar = () => screen.getByRole("button", { name: "Guardar cambios" }) as HTMLButtonElement;
const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("TasasForm", () => {
  it("muestra los montos actuales y deshabilita Guardar sin cambios", () => {
    render(<TasasForm tasas={tasas} historial={[]} />);
    expect(screen.getByLabelText(POSTERIOR)).toHaveValue("150.00");
    expect(screen.getByLabelText(PREVIA)).toHaveValue("300.00");
    expect(screen.getByLabelText(POSTERIOR)).toHaveAttribute("inputmode", "decimal");
    expect(guardar().disabled).toBe(true);
  });

  it("el diálogo muestra Antes → Ahora solo de lo modificado y no llama a la acción sin confirmar", async () => {
    render(<TasasForm tasas={tasas} historial={[]} />);
    escribir(POSTERIOR, "160");
    expect(guardar().disabled).toBe(false);
    fireEvent.click(guardar());
    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo).toHaveTextContent("S/ 150.00 → S/ 160.00");
    expect(dialogo).not.toHaveTextContent("S/ 300.00");
    expect(dialogo).toHaveTextContent("Los pagos en curso y los expedientes ya pagados no cambian.");
    expect(m.guardarTasasAction).not.toHaveBeenCalled();
  });

  it("confirmar guarda y cierra el diálogo", async () => {
    m.guardarTasasAction.mockResolvedValue({ ok: true, data: { POSTERIOR: 16000, PREVIA: 30000 } });
    render(<TasasForm tasas={tasas} historial={[]} />);
    escribir(POSTERIOR, "160");
    fireEvent.click(guardar());
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar cambio" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    const datos = m.guardarTasasAction.mock.calls[0][0] as FormData;
    expect(datos.get("posterior")).toBe("160");
    expect(datos.get("previa")).toBe("300.00");
    expect(screen.getByLabelText(POSTERIOR)).toHaveValue("160.00");
    expect(guardar().disabled).toBe(true);
  });

  it("error general: el diálogo sigue abierto con el mensaje", async () => {
    m.guardarTasasAction.mockResolvedValue({ ok: false, error: "No se pudo guardar el cambio. Inténtalo de nuevo." });
    render(<TasasForm tasas={tasas} historial={[]} />);
    escribir(PREVIA, "310");
    fireEvent.click(guardar());
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar cambio" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar el cambio");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("monto inválido: error por campo asociado y no abre el diálogo", () => {
    render(<TasasForm tasas={tasas} historial={[]} />);
    escribir(POSTERIOR, "4");
    fireEvent.click(guardar());
    const campo = screen.getByLabelText(POSTERIOR);
    expect(campo).toHaveAttribute("aria-invalid", "true");
    const ayuda = document.getElementById(campo.getAttribute("aria-describedby")!);
    expect(ayuda).toHaveTextContent("El monto debe estar entre S/ 5.00 y S/ 5,000.00.");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(m.guardarTasasAction).not.toHaveBeenCalled();
  });

  it("errores por campo del servidor cierran el diálogo y se muestran en el campo", async () => {
    m.guardarTasasAction.mockResolvedValue({
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: { previa: ["Escribe un monto válido, por ejemplo 150 o 150.50."] },
    });
    render(<TasasForm tasas={tasas} historial={[]} />);
    escribir(PREVIA, "310");
    fireEvent.click(guardar());
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar cambio" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByText("Escribe un monto válido, por ejemplo 150 o 150.50.")).toBeInTheDocument();
  });

  it("muestra el historial", () => {
    render(
      <TasasForm
        tasas={tasas}
        historial={[
          {
            id: "1",
            accion: "EDITAR",
            referencia: "POSTERIOR",
            valorAnterior: "15000",
            valorNuevo: "16000",
            actorNombre: "Jefa Uno",
            createdAt: new Date("2026-10-01T15:00:00Z"),
          },
        ]}
      />,
    );
    expect(screen.getByText("Cambió la tasa de ITSE posterior: S/ 150.00 → S/ 160.00")).toBeInTheDocument();
  });
});
