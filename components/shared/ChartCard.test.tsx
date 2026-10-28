import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);
import { ChartCard } from "@/components/shared/ChartCard";

const data = [
  { label: "Bajo", value: 3 },
  { label: "Alto", value: 5 },
];

function renderCard(d = data) {
  return render(
    <ChartCard title="Por riesgo" summary="8 expedientes en total." data={d} valueHeader="Expedientes">
      <span>grafico</span>
    </ChartCard>,
  );
}

describe("ChartCard", () => {
  it("muestra titulo y resumen visibles dentro de un figure", () => {
    const { container } = renderCard();
    expect(container.querySelector("figure")).not.toBeNull();
    expect(screen.getByText("Por riesgo").tagName).toBe("FIGCAPTION");
    expect(screen.getByText("8 expedientes en total.")).toBeVisible();
  });

  it("envuelve el grafico en role=img con aria-label titulo + resumen", () => {
    renderCard();
    const img = screen.getByRole("img", { name: "Por riesgo. 8 expedientes en total." });
    expect(within(img).getByText("grafico")).toBeInTheDocument();
  });

  it("incluye la tabla alternativa dentro de details, fuera del role=img", () => {
    const { container } = renderCard();
    const details = container.querySelector("details") as HTMLElement;
    expect(within(details).getByText("Ver datos en tabla").tagName).toBe("SUMMARY");
    expect(within(details).getByRole("columnheader", { name: "Categoría" })).toBeInTheDocument();
    expect(within(details).getByRole("columnheader", { name: "Expedientes" })).toBeInTheDocument();
    expect(within(details).getByRole("row", { name: /Alto\s*5/ })).toBeInTheDocument();
    expect(screen.getByRole("img").contains(details)).toBe(false);
  });

  it("sin datos muestra el mensaje y no el grafico ni la tabla", () => {
    const { container } = renderCard([]);
    expect(screen.getByText("Sin datos para mostrar.")).toBeInTheDocument();
    expect(screen.queryByText("grafico")).toBeNull();
    expect(container.querySelector("details")).toBeNull();
  });
});
