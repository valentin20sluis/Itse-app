import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  verificar: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/modules/certificados/services/verificacion.service", () => ({ verificarCertificado: h.verificar }));
vi.mock("next/navigation", () => ({ notFound: h.notFound }));
vi.mock("@/modules/landing/components/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("@/modules/landing/components/SiteFooter", () => ({ SiteFooter: () => null }));

import VerificarPage, { metadata } from "./page";
import { VerificacionResultado } from "@/modules/certificados/components/VerificacionResultado";

const AHORA = new Date("2027-01-10T15:00:00.000Z");
const data = (extra = {}) => ({
  numero: "0001-2026",
  nombreComercial: "Bodega Sol",
  distrito: "Distrito Uno",
  emitidoAt: new Date("2026-11-01T15:00:00.000Z"),
  venceAt: new Date("2028-03-15T05:00:00.000Z"),
  estado: "VIGENTE" as const,
  ...extra,
});

beforeEach(() => vi.clearAllMocks());

describe("/verificar/[codigo]", () => {
  it("no está indexada", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("llama a notFound() si no se encuentra", async () => {
    h.verificar.mockResolvedValue({ status: "no_encontrado" });
    await expect(VerificarPage({ params: Promise.resolve({ codigo: "xyz" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(h.notFound).toHaveBeenCalled();
  });

  it("decodifica el código de la URL antes de verificar", async () => {
    h.verificar.mockResolvedValue({ status: "ok", data: data() });
    await VerificarPage({ params: Promise.resolve({ codigo: "ABCD%20EFGH-JKMN" }) });
    expect(h.verificar).toHaveBeenCalledWith("ABCD EFGH-JKMN", expect.any(Date));
  });
});

describe("VerificacionResultado", () => {
  it("muestra solo los datos permitidos y el texto vigente", () => {
    render(<VerificacionResultado data={data()} ahora={AHORA} />);
    expect(screen.getByText(/0001-2026/)).toBeInTheDocument();
    expect(screen.getByText("Bodega Sol")).toBeInTheDocument();
    expect(screen.getByText("Distrito Uno")).toBeInTheDocument();
    expect(screen.getByText("Este certificado está vigente hasta el 15/03/2028.")).toBeInTheDocument();
    for (const t of [/solicitante/i, /DNI/, /correo/i, /teléfono/i, /RUC/, /dirección/i, /EXP-/]) {
      expect(screen.queryByText(t)).not.toBeInTheDocument();
    }
  });

  it("texto por estado", () => {
    const { rerender, container } = render(
      <VerificacionResultado
        data={data({ estado: "POR_VENCER", venceAt: new Date("2027-02-01T05:00:00.000Z") })}
        ahora={AHORA}
      />,
    );
    expect(container.textContent).toContain("vence en 22 días");
    rerender(<VerificacionResultado data={data({ estado: "VENCIDO" })} ahora={AHORA} />);
    expect(container.textContent).toContain("venció el 15/03/2028");
    rerender(<VerificacionResultado data={data({ estado: "REVOCADO" })} ahora={AHORA} />);
    expect(container.textContent).toContain("Este certificado fue anulado");
  });
});
