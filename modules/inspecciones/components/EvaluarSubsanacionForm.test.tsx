import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/inspecciones/actions/subsanacion.actions", () => ({
  evaluarSubsanacionAction: vi.fn(),
}));

import { EvaluarSubsanacionForm } from "@/modules/inspecciones/components/EvaluarSubsanacionForm";

afterEach(cleanup);

describe("EvaluarSubsanacionForm", () => {
  it("solo muestra las opciones recibidas", () => {
    render(<EvaluarSubsanacionForm expedienteId="e1" opciones={["NO_CUMPLE"]} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(1);
    expect(screen.getByRole("radio", { name: "No cumple" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Cumple" })).not.toBeInTheDocument();
  });

  it("muestra las tres opciones con su texto", () => {
    render(
      <EvaluarSubsanacionForm
        expedienteId="e1"
        opciones={["CUMPLE", "SIGUE_EN_SUBSANACION", "NO_CUMPLE"]}
      />,
    );
    for (const nombre of ["Cumple", "Sigue en subsanación", "No cumple"]) {
      expect(screen.getByRole("radio", { name: nombre })).toBeInTheDocument();
    }
    expect(screen.getByText("El solicitante verá este informe.")).toBeInTheDocument();
  });

  it("el botón abre la confirmación solo con el formulario válido", () => {
    render(<EvaluarSubsanacionForm expedienteId="e1" opciones={["CUMPLE", "NO_CUMPLE"]} />);
    const boton = screen.getByRole("button", { name: "Registrar evaluación" });
    fireEvent.click(boton);
    expect(screen.queryByText("¿Registrar la evaluación?")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Cumple" }));
    fireEvent.change(screen.getByLabelText("Informe"), { target: { value: "Todo en orden." } });
    fireEvent.click(boton);
    expect(screen.getByText("¿Registrar la evaluación?")).toBeInTheDocument();
  });
});
