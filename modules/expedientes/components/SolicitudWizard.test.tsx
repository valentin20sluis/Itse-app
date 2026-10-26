import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveBorradorAction: vi.fn(),
  enviarSolicitudAction: vi.fn(),
}));

vi.mock("@/modules/expedientes/actions/expediente.actions", () => mocks);

import type { Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";
import type { Expediente } from "@/modules/expedientes/types/expediente.types";
import { SolicitudWizard } from "./SolicitudWizard";

const EST_ID = "7a1c2d3e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";
const establecimientos = [
  {
    id: EST_ID,
    nombreComercial: "Bodega Central",
    direccion: "Av. Lima 123",
    areaM2: "100.00",
    numeroPisos: 4,
  },
] as unknown as Establecimiento[];

const expediente = {
  id: "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b",
  establecimientoId: EST_ID,
  tipoTramite: "RENOVACION",
  nivelRiesgo: null,
  tieneSotano: false,
  almacenaInflamables: false,
  solicitanteNombre: null,
  solicitanteDocumento: null,
  solicitanteTelefono: null,
  solicitanteEmail: null,
  esRepresentante: false,
  razonSocial: null,
  numeroBoleta: null,
} as unknown as Expediente;

const defaults = { nombre: "Ana Pérez", documento: "12345678", telefono: "999888777", email: "ana@mail.pe" };

function renderWizard(borrador: Expediente | null = null) {
  return render(
    <SolicitudWizard
      establecimientos={establecimientos}
      borrador={borrador}
      documentos={[]}
      defaultsSolicitante={defaults}
    />,
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("SolicitudWizard", () => {
  it("arranca en el paso 1 con aria-current", () => {
    renderWizard();
    expect(screen.getByText("Paso 1 de 5: Establecimiento")).toBeTruthy();
    expect(document.querySelector('[aria-current="step"]')).toBeTruthy();
    expect(screen.getByText("Bodega Central")).toBeTruthy();
    expect(screen.getByText(/100.00 m² · 4 pisos/)).toBeTruthy();
  });

  it("avanza al paso 2 cuando la acción responde ok", async () => {
    mocks.saveBorradorAction.mockResolvedValue({ ok: true, data: expediente });
    renderWizard();
    fireEvent.click(screen.getByLabelText(/Bodega Central/));
    fireEvent.click(screen.getByLabelText("Renovación"));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(screen.getByText("Paso 2 de 5: Riesgo")).toBeTruthy());
    expect(mocks.saveBorradorAction.mock.calls[0][0]).toBe(1);
  });

  it("permanece y muestra el error junto al campo con fieldErrors", async () => {
    mocks.saveBorradorAction.mockResolvedValue({
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: { establecimientoId: ["Selecciona un establecimiento."] },
    });
    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("Selecciona un establecimiento.")).toBeTruthy();
    expect(screen.getByText("Paso 1 de 5: Establecimiento")).toBeTruthy();
  });

  it("paso 2: sótano con 4 pisos sugiere riesgo muy alto y muestra el aviso", async () => {
    mocks.saveBorradorAction.mockResolvedValue({ ok: true, data: expediente });
    renderWizard(expediente);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await screen.findByText("Paso 2 de 5: Riesgo");
    expect(screen.getByText("Sugerencia: Riesgo alto")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("¿Tiene sótano?"));
    expect(screen.getByText("Sugerencia: Riesgo muy alto")).toBeTruthy();
    expect(screen.getByText("Es solo una orientación. GRDyDC confirmará el nivel de riesgo.")).toBeTruthy();
    expect((screen.getByLabelText("Riesgo alto") as HTMLInputElement).checked).toBe(false);
  });

  it("con un borrador precarga el tipo de trámite y el establecimiento", () => {
    renderWizard(expediente);
    expect((screen.getByLabelText("Renovación") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText(/Bodega Central/) as HTMLInputElement).checked).toBe(true);
  });
});
