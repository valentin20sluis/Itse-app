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
const EST_CHICO_ID = "9b2c3d4e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";
const establecimientos = [
  {
    id: EST_ID,
    nombreComercial: "Bodega Central",
    direccion: "Av. Lima 123",
    areaM2: "100.00",
    numeroPisos: 4,
  },
  {
    id: EST_CHICO_ID,
    nombreComercial: "Kiosco",
    direccion: "Jr. Cusco 45",
    areaM2: "50.00",
    numeroPisos: 1,
  },
] as unknown as Establecimiento[];

const expediente = {
  id: "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b",
  establecimientoId: EST_ID,
  tipoTramite: "RENOVACION",
  nivelRiesgo: null,
  tieneSotano: false,
  almacenaInflamables: false,
  tieneCocina: false,
  esGrifo: false,
  usoMixtoPatrimonio: false,
  granEscala: false,
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

  it("paso 2: las casillas de cocina y grifo se envían en el formulario", async () => {
    mocks.saveBorradorAction.mockResolvedValue({ ok: true, data: expediente });
    renderWizard(expediente);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await screen.findByText("Paso 2 de 5: Riesgo");
    fireEvent.click(screen.getByLabelText(/¿Tiene cocina/));
    fireEvent.click(screen.getByLabelText(/¿Es un grifo/));
    mocks.saveBorradorAction.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(mocks.saveBorradorAction).toHaveBeenCalled());
    const formData = mocks.saveBorradorAction.mock.calls[0][3] as FormData;
    expect(formData.get("tieneCocina")).toBe("on");
    expect(formData.get("esGrifo")).toBe("on");
  });

  describe("paso 2 con Hospedaje", () => {
    const MIXTO = /uso mixto o es patrimonio/;
    const GRAN = /restaurante de alta capacidad/;
    const hospedaje = (numeroCamas: number) =>
      [{ ...establecimientos[0], funcion: "HOSPEDAJE", numeroCamas, numeroPisos: 1 }] as unknown as Establecimiento[];

    async function irAlPaso2(ests: Establecimiento[]) {
      mocks.saveBorradorAction.mockResolvedValue({ ok: true, data: expediente });
      render(
        <SolicitudWizard establecimientos={ests} borrador={expediente} documentos={[]} defaultsSolicitante={defaults} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
      await screen.findByText("Paso 2 de 5: Riesgo");
    }

    it("sin Hospedaje no muestra las casillas ni las envía", async () => {
      await irAlPaso2(establecimientos);
      expect(screen.queryByLabelText(MIXTO)).toBeNull();
      expect(screen.queryByLabelText(GRAN)).toBeNull();
      mocks.saveBorradorAction.mockClear();
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
      await waitFor(() => expect(mocks.saveBorradorAction).toHaveBeenCalled());
      const formData = mocks.saveBorradorAction.mock.calls[0][3] as FormData;
      expect(formData.get("usoMixtoPatrimonio")).toBeNull();
      expect(formData.get("granEscala")).toBeNull();
    });

    it("con Hospedaje muestra las casillas, las envía y recalcula la sugerencia", async () => {
      await irAlPaso2(hospedaje(40));
      const mixto = screen.getByLabelText(MIXTO);
      expect(screen.getByLabelText(GRAN)).toBeTruthy();
      fireEvent.click(mixto);
      expect(screen.getByText("Sugerencia: Riesgo alto")).toBeTruthy();
      fireEvent.click(screen.getByLabelText(GRAN));
      expect(screen.getByText("Sugerencia: Riesgo muy alto")).toBeTruthy();
      mocks.saveBorradorAction.mockClear();
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
      await waitFor(() => expect(mocks.saveBorradorAction).toHaveBeenCalled());
      const formData = mocks.saveBorradorAction.mock.calls[0][3] as FormData;
      expect(formData.get("usoMixtoPatrimonio")).toBe("on");
      expect(formData.get("granEscala")).toBe("on");
    });

    it("101 camas sugiere riesgo muy alto", async () => {
      await irAlPaso2(hospedaje(101));
      expect(screen.getByText("Sugerencia: Riesgo muy alto")).toBeTruthy();
    });
  });

  describe("paso 4 y resumen", () => {
    async function irAlPaso(exp: Expediente, paso: 4 | 5) {
      mocks.saveBorradorAction.mockResolvedValue({ ok: true, data: exp });
      renderWizard(exp);
      for (let p = 1; p < paso; p++) {
        await screen.findByText(new RegExp(`Paso ${p} de 5`));
        fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
      }
      await screen.findByText(new RegExp(`Paso ${paso} de 5`));
    }
    const AVISO = /El Plan de seguridad no se sube/;

    it("MEDIO lista 3 documentos y el aviso del plan según planSeguridadFisico", async () => {
      await irAlPaso({ ...expediente, nivelRiesgo: "MEDIO" }, 4);
      expect(screen.getAllByText(/Pendiente/)).toHaveLength(3);
      expect(screen.getByText("Ficha RUC")).toBeTruthy();
      expect(screen.getByLabelText("Número de boleta")).toBeTruthy();
      expect(screen.queryByText(AVISO)).toBeNull();
    });

    it("muestra el aviso del plan cuando el local es pequeño", async () => {
      await irAlPaso({ ...expediente, establecimientoId: EST_CHICO_ID, nivelRiesgo: "MEDIO" }, 4);
      expect(screen.getByText(AVISO)).toBeTruthy();
    });

    it("ALTO lista los documentos técnicos y el aviso del plan", async () => {
      await irAlPaso({ ...expediente, nivelRiesgo: "ALTO" }, 4);
      expect(screen.getAllByText(/Pendiente/)).toHaveLength(7);
      expect(screen.getByText("Planos eléctricos")).toBeTruthy();
      expect(screen.getByText(AVISO)).toBeTruthy();
    });

    it("cocina agrega extintores Tipo K", async () => {
      await irAlPaso({ ...expediente, nivelRiesgo: "MEDIO", tieneCocina: true }, 4);
      expect(screen.getAllByText(/Pendiente/)).toHaveLength(4);
      expect(screen.getByText("Certificado de extintores Tipo K")).toBeTruthy();
    });

    it("el resumen sin nivel de riesgo no lista documentos", async () => {
      await irAlPaso(expediente, 5);
      expect(screen.queryByText("Ficha RUC")).toBeNull();
      expect(screen.queryByText(AVISO)).toBeNull();
    });

    it("el resumen lista los requeridos del riesgo", async () => {
      await irAlPaso({ ...expediente, nivelRiesgo: "MEDIO" }, 5);
      expect(screen.getByText("Ficha RUC")).toBeTruthy();
      expect(screen.getAllByText("Pendiente")).toHaveLength(3);
    });
  });
});
