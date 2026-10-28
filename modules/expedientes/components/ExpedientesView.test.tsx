import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const anularBorradorAction = vi.hoisted(() => vi.fn());
vi.mock("@/modules/expedientes/actions/expediente.actions", () => ({ anularBorradorAction }));

import { ExpedientesView } from "./ExpedientesView";
import type { ExpedienteListItem } from "@/modules/expedientes/types/expediente.types";

const base = {
  id: "e1",
  numero: null,
  tipoTramite: "NUEVA",
  estado: "BORRADOR",
  establecimientoNombre: "Bodega Ficticia",
  pagoPendiente: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  presentadoAt: null,
} as unknown as ExpedienteListItem;

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("ExpedientesView: pagado y ver detalle", () => {
  const presentado = {
    ...base,
    id: "e9",
    numero: "EXP-2026-00001",
    estado: "PRESENTADO",
    pagadoAt: new Date("2026-03-15T17:00:00Z"),
  } as unknown as ExpedienteListItem;

  it("muestra Pagado con fecha y Ver detalle en un expediente presentado", () => {
    render(<ExpedientesView expedientes={[presentado]} />);
    expect(screen.getByText("Pagado")).toBeInTheDocument();
    expect(screen.getByText("Pagado el 15/03/2026")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Ver detalle del expediente EXP-2026-00001" });
    expect(link).toHaveAttribute("href", "/mi-cuenta/expedientes/e9");
  });

  it("un expediente entregado indica ir a Mis certificados (certificado y resolución, o solo resolución)", () => {
    const entregado = { ...presentado, estado: "ENTREGADO", resolucionNoCumpleNumero: null } as unknown as ExpedienteListItem;
    render(<ExpedientesView expedientes={[entregado]} />);
    expect(screen.getByRole("link", { name: "Mis certificados" })).toHaveAttribute("href", "/mi-cuenta/certificados");
    expect(screen.getByText(/para descargar tu certificado y tu resolución./)).toBeInTheDocument();
    cleanup();
    const noCumple = { ...entregado, resolucionNoCumpleNumero: "RG-2026-0001" } as unknown as ExpedienteListItem;
    render(<ExpedientesView expedientes={[noCumple]} />);
    expect(screen.getByRole("link", { name: "Mis certificados" })).toHaveAttribute("href", "/mi-cuenta/certificados");
    expect(screen.getByText(/para descargar tu resolución./)).toBeInTheDocument();
    expect(screen.queryByText(/Ver detalle» para descargar/)).toBeNull();
  });

  it("un expediente finalizado con resolución de no cumple muestra «Resolución Aprobada»", () => {
    const finalizado = { ...presentado, estado: "FINALIZADO", resolucionNoCumpleNumero: "RG-2026-0001" } as unknown as ExpedienteListItem;
    render(<ExpedientesView expedientes={[finalizado]} />);
    expect(screen.getByText("Resolución Aprobada")).toBeInTheDocument();
    cleanup();
    render(<ExpedientesView expedientes={[{ ...finalizado, resolucionNoCumpleNumero: null } as unknown as ExpedienteListItem]} />);
    expect(screen.getByText("Certificado y Resolución Aprobado")).toBeInTheDocument();
  });

  it("un borrador no muestra Pagado ni Ver detalle", () => {
    render(<ExpedientesView expedientes={[{ ...base, pagadoAt: null } as unknown as ExpedienteListItem]} />);
    expect(screen.queryByText(/Pagado/)).toBeNull();
    expect(screen.queryByRole("link", { name: /Ver detalle/ })).toBeNull();
  });
});

describe("ExpedientesView: anular borrador", () => {
  it("muestra Continuar y Anular en BORRADOR (con o sin falta de pago)", () => {
    render(<ExpedientesView expedientes={[base, { ...base, id: "e2", pagoPendiente: true }]} />);
    expect(screen.getAllByRole("link", { name: /Continuar solicitud/ })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Anular solicitud de Bodega Ficticia" })).toHaveLength(2);
  });

  it("no muestra botones en otros estados", () => {
    render(<ExpedientesView expedientes={[{ ...base, estado: "PRESENTADO" }]} />);
    expect(screen.queryByRole("button", { name: /Anular/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Continuar/ })).toBeNull();
  });

  it("pide confirmación y llama a la acción solo al confirmar", async () => {
    anularBorradorAction.mockResolvedValue({ ok: true, data: { id: "e1" } });
    render(<ExpedientesView expedientes={[base]} />);

    fireEvent.click(screen.getByRole("button", { name: /Anular solicitud/ }));
    expect(await screen.findByText("¿Anular esta solicitud?")).toBeInTheDocument();
    expect(anularBorradorAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(anularBorradorAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Anular solicitud/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, anular" }));
    await waitFor(() => expect(anularBorradorAction).toHaveBeenCalledWith("e1"));
  });

  it("muestra el error de la acción", async () => {
    anularBorradorAction.mockResolvedValue({ ok: false, error: "No se encontró la solicitud." });
    render(<ExpedientesView expedientes={[base]} />);
    fireEvent.click(screen.getByRole("button", { name: /Anular solicitud/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, anular" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se encontró la solicitud.");
  });
});
