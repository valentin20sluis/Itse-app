import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Reveal } from "./Reveal";

const disconnect = vi.fn();
let trigger: (isIntersecting: boolean) => void;

function mockEnv(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches: reduce }),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (e: { isIntersecting: boolean }[]) => void) {
        trigger = (isIntersecting) => cb([{ isIntersecting }]);
      }
      observe = vi.fn();
      disconnect = disconnect;
    },
  );
}

describe("Reveal", () => {
  beforeEach(() => disconnect.mockClear());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows content immediately with reduced motion", () => {
    mockEnv(true);
    render(<Reveal>hola</Reveal>);
    const el = screen.getByText("hola");
    expect(el).toHaveAttribute("data-state", "visible");
    expect(el).not.toHaveClass("opacity-0");
  });

  it("goes from hidden to visible when intersecting", () => {
    mockEnv(false);
    render(<Reveal>hola</Reveal>);
    const el = screen.getByText("hola");
    expect(el).toHaveAttribute("data-state", "hidden");
    expect(el).toHaveClass("opacity-0");
    act(() => trigger(true));
    expect(el).toHaveAttribute("data-state", "visible");
    expect(el).not.toHaveClass("opacity-0");
  });

  it("disconnects the observer on unmount", () => {
    mockEnv(false);
    const { unmount } = render(<Reveal>hola</Reveal>);
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
