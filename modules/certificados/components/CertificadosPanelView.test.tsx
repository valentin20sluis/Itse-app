import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CertificadosPanelView } from "@/modules/certificados/components/CertificadosPanelView";
import type { CertificadoPanelFila } from "@/modules/certificados/services/certificado-lista.service";

afterEach(cleanup);

const fila = (o: Partial<CertificadoPanelFila>): CertificadoPanelFila => ({
  expedienteId: "e1",
  expedienteNumero: "EXP-2026-00001",
  numero: "0001-2026",
  nombreComercial: "Bodega Ficticia",
  distrito: "Centro",
  emitidoAt: new Date("2026-10-28T05:00:00Z"),
  venceAt: new Date("2028-10-28T05:00:00Z"),
  diasRestantes: 700,
  estado: "VIGENTE",
  ...o,
});

describe("CertificadosPanelView", () => {
  it("ofrece descargar el certificado y la resolución de un certificado vigente", () => {
    render(<CertificadosPanelView filas={[fila({})]} filtro="todos" />);
    expect(screen.getByRole("link", { name: /Descargar certificado N.° 0001-2026/ })).toHaveAttribute(
      "href",
      "/api/expedientes/e1/certificado",
    );
    expect(screen.getByRole("link", { name: /Descargar resolución/ })).toHaveAttribute(
      "href",
      "/api/expedientes/e1/resolucion",
    );
  });

  it("no ofrece descargas de un certificado anulado", () => {
    render(<CertificadosPanelView filas={[fila({ estado: "REVOCADO" })]} filtro="todos" />);
    expect(screen.queryByRole("link", { name: /Descargar/ })).toBeNull();
  });
});
