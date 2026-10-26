import { describe, it, expect, beforeAll, afterEach } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { HeroCarousel } from "./HeroCarousel"
import { heroSlides } from "@/modules/landing/data/hero-slides"

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
  })) as unknown as typeof window.matchMedia
  globalThis.ResizeObserver = Noop as unknown as typeof ResizeObserver
  globalThis.IntersectionObserver = Noop as unknown as typeof IntersectionObserver
})

afterEach(cleanup)

describe("HeroCarousel", () => {
  it("renderiza los 3 títulos y los enlaces de cada slide", () => {
    render(<HeroCarousel />)
    for (const { title } of heroSlides) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument()
    }
    expect(screen.getAllByRole("link", { name: "Crear cuenta" })).toHaveLength(3)
    screen.getAllByRole("link", { name: "Crear cuenta" }).forEach((a) =>
      expect(a).toHaveAttribute("href", "/sign-up")
    )
    screen.getAllByRole("link", { name: "Cómo funciona" }).forEach((a) =>
      expect(a).toHaveAttribute("href", "#como-funciona")
    )
  })

  it("tiene flechas e indicadores accesibles", () => {
    render(<HeroCarousel />)
    expect(screen.getByRole("button", { name: "Diapositiva anterior" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Diapositiva siguiente" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /Ir a la diapositiva/ })).toHaveLength(3)
  })
})
