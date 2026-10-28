import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ClientNav } from "./ClientNav";

const pathname = vi.hoisted(() => ({ value: "/mi-cuenta" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

describe("ClientNav", () => {
  it("renderiza las 6 etiquetas y marca solo la ruta actual", () => {
    pathname.value = "/mi-cuenta/perfil";
    render(<ClientNav />);
    expect(screen.getAllByText("Mi perfil")).toHaveLength(1);
    expect(screen.getByText("Perfil")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Mi perfil", current: "page", hidden: true })).toHaveLength(2);
    expect(screen.getAllByText("Inicio")).toHaveLength(2);
    const current = document.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(2);
    current.forEach((el) => expect(el).toHaveAttribute("href", "/mi-cuenta/perfil"));
  });

  it("no marca Inicio en /mi-cuenta/expedientes", () => {
    pathname.value = "/mi-cuenta/expedientes";
    render(<ClientNav />);
    const hrefs = [...document.querySelectorAll('[aria-current="page"]')].map((e) =>
      e.getAttribute("href"),
    );
    expect(hrefs).not.toContain("/mi-cuenta");
    expect(hrefs).toContain("/mi-cuenta/expedientes");
  });
});
