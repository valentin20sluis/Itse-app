import { describe, it, expect } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MobileNav } from "@/modules/landing/components/MobileNav"

describe("MobileNav", () => {
  it("abre el Sheet con anclas y botones, y se cierra al elegir una ancla", async () => {
    render(<MobileNav />)

    expect(screen.queryByRole("dialog")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }))

    expect(await screen.findByRole("dialog")).toBeTruthy()
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"))
    expect(hrefs).toEqual([
      "#que-es-la-itse",
      "#como-funciona",
      "#niveles-de-riesgo",
      "#preguntas-frecuentes",
      "/sign-in",
      "/sign-up",
    ])

    fireEvent.click(screen.getByRole("link", { name: "Cómo funciona" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })
})
