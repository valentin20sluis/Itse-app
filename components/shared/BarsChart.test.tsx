import { cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("recharts", async (importOriginal) => {
  const real = await importOriginal<typeof import("recharts")>();
  return {
    ...real,
    ResponsiveContainer: ({ children }: { children: ReactElement }) => (
      <real.ResponsiveContainer width={800} height={400} initialDimension={{ width: 800, height: 400 }}>
        {children}
      </real.ResponsiveContainer>
    ),
  };
});

import { BarsChart } from "@/components/shared/BarsChart";

afterEach(cleanup);

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const data = [
  { label: "Bajo", value: 3 },
  { label: "Alto", value: 12, token: 5 as const },
];

describe("BarsChart", () => {
  it("imprime etiquetas de categoria y valores (horizontal)", () => {
    const { container } = render(<BarsChart data={data} valueLabel="Expedientes" />);
    const texto = container.textContent ?? "";
    for (const t of ["Bajo", "Alto", "3", "12"]) expect(texto).toContain(t);
  });

  it("funciona en vertical y con un solo elemento", () => {
    const { container } = render(
      <BarsChart data={[{ label: "Unico", value: 7 }]} orientation="vertical" valueLabel="Expedientes" />,
    );
    expect(container.textContent).toContain("Unico");
    expect(container.textContent).toContain("7");
  });

  it("colorea con tokens del tema, sin colores literales", () => {
    const { container } = render(<BarsChart data={data} valueLabel="Expedientes" />);
    const fills = Array.from(container.querySelectorAll(".recharts-bar-rectangle path, .recharts-bar-rectangle rect")).map(
      (n) => n.getAttribute("fill"),
    );
    expect(fills).toEqual(expect.arrayContaining(["var(--chart-1)", "var(--chart-5)"]));
  });

  it("el alto horizontal crece con el numero de barras", () => {
    const muchas = Array.from({ length: 20 }, (_, i) => ({ label: `C${i}`, value: i }));
    const { container } = render(<BarsChart data={muchas} valueLabel="Expedientes" />);
    const alto = (container.querySelector('[data-slot="chart"]') as HTMLElement).style.height;
    expect(parseInt(alto)).toBeGreaterThanOrEqual(20 * 36);
  });
});
