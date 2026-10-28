import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/inspecciones/actions/diligencia.actions", () => ({
  registrarResultadoAction: vi.fn(),
}));

import { ResultadoDiligenciaForm } from "@/modules/inspecciones/components/ResultadoDiligenciaForm";

afterEach(cleanup);

const CATALOGO = Array.from({ length: 6 }, (_, i) => ({ codigo: `C${i}`, descripcion: `Observación ${i}` }));

const montar = (
  tipoItse: "POSTERIOR" | "PREVIA" | null,
  catalogo: readonly { codigo: string; descripcion: string }[] = CATALOGO,
) =>
  render(
    <ResultadoDiligenciaForm
      expedienteId="e1"
      tipoItse={tipoItse}
      min="2026-10-28"
      max="2026-11-25"
      catalogo={catalogo}
    />,
  );

const elegir = (nombre: string) => fireEvent.click(screen.getByRole("radio", { name: nombre }));

describe("ResultadoDiligenciaForm", () => {
  it("sin tipo de ITSE no ofrece la suspensión", () => {
    montar(null);
    expect(screen.queryByRole("radio", { name: "Observaciones subsanables" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("el bloque de observaciones solo aparece con la suspensión o «No cumple»", () => {
    montar("POSTERIOR");
    expect(screen.queryByText("Otras observaciones (una por línea)")).not.toBeInTheDocument();
    elegir("Cumple");
    expect(screen.queryByText("Otras observaciones (una por línea)")).not.toBeInTheDocument();
    elegir("No cumple");
    expect(screen.getByText("Otras observaciones (una por línea)")).toBeInTheDocument();
    elegir("Observaciones subsanables");
    expect(screen.getByText("Otras observaciones (una por línea)")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(6);
  });

  it("la nueva fecha solo se pide en previa, con min y max", () => {
    const { unmount } = montar("PREVIA");
    elegir("Observaciones subsanables");
    const fecha = screen.getByLabelText("Nueva fecha de inspección");
    expect(fecha).toHaveAttribute("min", "2026-10-28");
    expect(fecha).toHaveAttribute("max", "2026-11-25");
    expect(fecha).toBeRequired();
    expect(screen.getByText("Plazo máximo: 20 días hábiles")).toBeInTheDocument();
    unmount();

    montar("POSTERIOR");
    elegir("Observaciones subsanables");
    expect(screen.queryByLabelText("Nueva fecha de inspección")).not.toBeInTheDocument();
    expect(screen.getByText("Plazo máximo: 3 días hábiles")).toBeInTheDocument();
  });

  it("en posterior avisa si hay observaciones libres al suspender", () => {
    montar("POSTERIOR");
    elegir("No cumple");
    fireEvent.change(screen.getByLabelText("Otras observaciones (una por línea)"), {
      target: { value: "Grieta en la columna" },
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    elegir("Observaciones subsanables");
    expect(screen.getByRole("status")).toHaveTextContent(
      'Hay observaciones relevantes: en una inspección posterior solo se puede registrar "No cumple".',
    );
  });

  it("en previa no avisa de observaciones relevantes", () => {
    montar("PREVIA");
    elegir("Observaciones subsanables");
    fireEvent.change(screen.getByLabelText("Otras observaciones (una por línea)"), {
      target: { value: "Grieta en la columna" },
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("lista solo las casillas del catálogo recibido", () => {
    montar("POSTERIOR", CATALOGO.slice(0, 2));
    elegir("No cumple");
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(screen.getByRole("checkbox", { name: "Observación 1" })).toBeInTheDocument();
  });

  it("catálogo vacío en posterior avisa y no ofrece casillas", () => {
    montar("POSTERIOR", []);
    elegir("Observaciones subsanables");
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(
      screen.getByText("No hay observaciones no relevantes activas: cualquier observación será relevante."),
    ).toBeInTheDocument();
  });

  it("catálogo vacío en previa no muestra el aviso", () => {
    montar("PREVIA", []);
    elegir("Observaciones subsanables");
    expect(screen.queryByText(/No hay observaciones no relevantes activas/)).not.toBeInTheDocument();
  });
});
