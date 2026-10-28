import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlazoSubsanacion } from "@/modules/inspecciones/components/PlazoSubsanacion";

afterEach(cleanup);

const FERIADOS = ["2026-11-01"];
const limite = new Date("2026-11-02T05:00:00.000Z");

describe("PlazoSubsanacion", () => {
  it("muestra la fecha límite y los días hábiles que quedan", () => {
    render(<PlazoSubsanacion limite={limite} feriados={FERIADOS} ahora={new Date("2026-10-28T15:00:00.000Z")} />);
    expect(screen.getByText("Fecha límite: 02/11/2026")).toBeInTheDocument();
    expect(screen.getByText("Quedan 3 días hábiles")).toBeInTheDocument();
  });

  it("un feriado entre hoy y el límite descuenta un día", () => {
    render(
      <PlazoSubsanacion limite={limite} feriados={["2026-10-29"]} ahora={new Date("2026-10-28T15:00:00.000Z")} />,
    );
    expect(screen.getByText("Quedan 2 días hábiles")).toBeInTheDocument();
  });

  it("sin feriados intermedios los fines de semana igual no cuentan", () => {
    render(<PlazoSubsanacion limite={limite} feriados={[]} ahora={new Date("2026-10-28T15:00:00.000Z")} />);
    expect(screen.getByText("Quedan 3 días hábiles")).toBeInTheDocument();
  });

  it("en singular cuando queda un día", () => {
    render(<PlazoSubsanacion limite={limite} feriados={FERIADOS} ahora={new Date("2026-10-30T15:00:00.000Z")} />);
    expect(screen.getByText("Quedan 1 día hábil")).toBeInTheDocument();
  });

  it("el último día dice que vence hoy", () => {
    render(<PlazoSubsanacion limite={limite} feriados={FERIADOS} ahora={new Date("2026-11-02T15:00:00.000Z")} />);
    expect(screen.getByText("Vence hoy")).toBeInTheDocument();
  });

  it("pasado el límite muestra la insignia de plazo vencido", () => {
    render(<PlazoSubsanacion limite={limite} feriados={FERIADOS} ahora={new Date("2026-11-03T15:00:00.000Z")} />);
    expect(screen.getByText("Plazo vencido")).toBeInTheDocument();
    expect(screen.queryByText(/Quedan|Vence hoy/)).not.toBeInTheDocument();
  });
});
