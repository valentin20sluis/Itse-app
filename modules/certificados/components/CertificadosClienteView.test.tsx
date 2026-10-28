import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CertificadosClienteView } from "@/modules/certificados/components/CertificadosClienteView";
import type { CertificadoClienteFila } from "@/modules/certificados/services/certificado-lista.service";

const cert = {
  expedienteId: "e1",
  numero: "0001-2026",
  nombreComercial: "Bodega Ficticia",
  emitidoAt: new Date("2027-01-01T15:00:00Z"),
  venceAt: new Date("2029-01-01T15:00:00Z"),
  diasRestantes: 700,
  estado: "VIGENTE",
} as CertificadoClienteFila;

describe("CertificadosClienteView", () => {
  it("lista la resolución de no cumple con un único botón a /resolucion", () => {
    render(
      <CertificadosClienteView
        filas={[]}
        resoluciones={[
          {
            expedienteId: "e2",
            nombreComercial: "Tienda Ficticia",
            resolucionAt: new Date("2027-01-05T15:00:00Z"),
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Resolución de no cumple" }),
    ).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: /Descargar/ });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/api/expedientes/e2/resolucion");
    expect(screen.queryByText(/Aún no tienes certificados/)).toBeNull();
  });

  it("el certificado normal conserva Descargar certificado y resolución", () => {
    render(<CertificadosClienteView filas={[cert]} resoluciones={[]} />);
    expect(
      screen.getByRole("link", {
        name: /Descargar certificado N\.° 0001-2026/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Descargar resolución del certificado/,
      }),
    ).toBeInTheDocument();
  });

  it("sin nada muestra el estado vacío", () => {
    render(<CertificadosClienteView filas={[]} resoluciones={[]} />);
    expect(screen.getByText(/Aún no tienes certificados/)).toBeInTheDocument();
  });
});
