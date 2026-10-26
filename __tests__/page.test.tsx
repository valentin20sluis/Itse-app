import { describe, expect, it, beforeAll, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Home from "@/app/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

class Noop {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
    onchange: null,
  })) as unknown as typeof window.matchMedia;
  globalThis.ResizeObserver = Noop as unknown as typeof ResizeObserver;
  globalThis.IntersectionObserver = Noop as unknown as typeof IntersectionObserver;
});

afterEach(cleanup);

describe("Landing", () => {
  it("renderiza el h1, las secciones ancladas y el aviso académico", () => {
    const { container } = render(<Home />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    for (const id of ["que-es-la-itse", "como-funciona", "niveles-de-riesgo", "preguntas-frecuentes"]) {
      expect(container.querySelector(`section#${id}`)).not.toBeNull();
    }
    expect(
      screen.getByText("Proyecto académico. No es un sistema oficial de ninguna municipalidad.")
    ).toBeInTheDocument();
  });
});
