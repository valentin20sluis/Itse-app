import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveBorradorAction: vi.fn(),
  iniciarPagoAction: vi.fn(),
}));

vi.mock("@/modules/expedientes/actions/expediente.actions", () => ({
  saveBorradorAction: mocks.saveBorradorAction,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/uploadthing", () => ({
  useUploadThing: () => ({ startUpload: vi.fn(), isUploading: false }),
}));
vi.mock("@/modules/expedientes/actions/pago.actions", () => ({
  iniciarPagoAction: mocks.iniciarPagoAction,
}));

import type { Establecimiento } from "@/modules/establecimientos/types/establecimiento.types";
import type { Expediente, ExpedienteDocumento } from "@/modules/expedientes/types/expediente.types";
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
  calidadSolicitante: "PROPIETARIO",
} as unknown as Expediente;

const defaults = { nombre: "Ana Pérez", documento: "12345678", telefono: "999888777", email: "ana@mail.pe" };

function renderWizard(borrador: Expediente | null = null, documentos: ExpedienteDocumento[] = []) {
  return render(
    <SolicitudWizard
      establecimientos={establecimientos}
      borrador={borrador}
      documentos={documentos}
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

  it.each([
    ["COMERCIO", /¿Tiene cocina/, /¿Es un grifo/, "tieneCocina"],
    ["OFICINAS_ADMINISTRATIVAS", /¿Es un grifo/, /¿Tiene cocina/, "esGrifo"],
  ] as const)("paso 2 con %s: solo muestra su casilla y se envía en el formulario", async (funcion, visible, oculta, campo) => {
    mocks.saveBorradorAction.mockResolvedValue({ ok: true, data: expediente });
    render(
      <SolicitudWizard
        establecimientos={[{ ...establecimientos[0], funcion }] as unknown as Establecimiento[]}
        borrador={expediente}
        documentos={[]}
        defaultsSolicitante={defaults}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await screen.findByText("Paso 2 de 5: Riesgo");
    expect(screen.queryByLabelText(oculta)).toBeNull();
    fireEvent.click(screen.getByLabelText(visible));
    mocks.saveBorradorAction.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(mocks.saveBorradorAction).toHaveBeenCalled());
    const formData = mocks.saveBorradorAction.mock.calls[0][3] as FormData;
    expect(formData.get(campo)).toBe("on");
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

  describe("paso 3 solicitante", () => {
    async function irAlPaso3(exp: Expediente) {
      mocks.saveBorradorAction.mockResolvedValue({ ok: true, data: exp });
      renderWizard(exp);
      for (const p of [1, 2]) {
        await screen.findByText(new RegExp(`Paso ${p} de 5`));
        fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
      }
      await screen.findByText(/Paso 3 de 5/);
    }
    const input = (re: RegExp) => screen.getByLabelText(re) as HTMLInputElement;

    it("Propietario preseleccionado, DNI con accept PDF y sin acreditación", async () => {
      await irAlPaso3(expediente);
      expect(screen.getByRole("group", { name: "Calidad del solicitante" })).toBeTruthy();
      expect((screen.getByLabelText("Propietario") as HTMLInputElement).checked).toBe(true);
      expect(input(/Elegir archivo: DNI/).getAttribute("accept")).toBe("application/pdf");
      expect(screen.queryByLabelText(/Elegir archivo: Documento que acredita/)).toBeNull();
    });

    it("elegir Representante legal muestra la acreditación solo PDF y se envía en el formulario", async () => {
      await irAlPaso3(expediente);
      fireEvent.click(screen.getByLabelText("Representante legal"));
      expect(input(/Elegir archivo: Documento que acredita/).getAttribute("accept")).toBe("application/pdf");
      mocks.saveBorradorAction.mockClear();
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
      await waitFor(() => expect(mocks.saveBorradorAction).toHaveBeenCalled());
      const formData = mocks.saveBorradorAction.mock.calls[0][3] as FormData;
      expect(formData.get("calidadSolicitante")).toBe("REPRESENTANTE_LEGAL");
    });
  });

  describe("paso 4 y resumen", () => {
    async function irAlPaso(exp: Expediente, paso: 4 | 5, documentos: ExpedienteDocumento[] = []) {
      mocks.saveBorradorAction.mockResolvedValue({ ok: true, data: exp });
      renderWizard(exp, documentos);
      for (let p = 1; p < paso; p++) {
        await screen.findByText(new RegExp(`Paso ${p} de 5`));
        fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
      }
      await screen.findByText(new RegExp(`Paso ${paso} de 5`));
    }
    const CHICO = { ...expediente, establecimientoId: EST_CHICO_ID };

    it("MEDIO de 1 piso lista 3 documentos, sin Plan de seguridad", async () => {
      await irAlPaso({ ...CHICO, nivelRiesgo: "MEDIO" }, 4);
      expect(screen.getAllByText("Obligatorio")).toHaveLength(3);
      expect(screen.getByText("Ficha RUC")).toBeTruthy();
      expect(screen.queryByLabelText("Número de boleta")).toBeNull();
      expect(screen.queryByText("Plan de seguridad")).toBeNull();
    });

    it("MEDIO de 2 o más pisos pide el Plan de seguridad", async () => {
      await irAlPaso({ ...expediente, nivelRiesgo: "MEDIO" }, 4);
      expect(screen.getAllByText("Obligatorio")).toHaveLength(4);
      expect(screen.getByText("Plan de seguridad")).toBeTruthy();
    });

    it("BAJO no pide el Plan de seguridad", async () => {
      await irAlPaso({ ...expediente, nivelRiesgo: "BAJO" }, 4);
      expect(screen.queryByText("Plan de seguridad")).toBeNull();
    });

    it("ALTO con 1 piso lista los técnicos y el Plan de seguridad", async () => {
      await irAlPaso({ ...CHICO, nivelRiesgo: "ALTO" }, 4);
      expect(screen.getAllByText("Obligatorio")).toHaveLength(8);
      expect(screen.getByText("Planos eléctricos")).toBeTruthy();
      expect(screen.getByText("Plan de seguridad")).toBeTruthy();
    });

    it("cocina agrega extintores Tipo K", async () => {
      await irAlPaso({ ...CHICO, nivelRiesgo: "MEDIO", tieneCocina: true }, 4);
      expect(screen.getAllByText("Obligatorio")).toHaveLength(4);
      expect(screen.getByText("Certificado de extintores Tipo K")).toBeTruthy();
    });

    it("el resumen sin nivel de riesgo no lista documentos", async () => {
      await irAlPaso(expediente, 5);
      expect(screen.queryByText("Ficha RUC")).toBeNull();
    });

    it("el paso 4 avanza sin llamar a saveBorradorAction", async () => {
      await irAlPaso({ ...expediente, nivelRiesgo: "MEDIO" }, 4);
      mocks.saveBorradorAction.mockClear();
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
      await screen.findByText(/Paso 5 de 5/);
      expect(mocks.saveBorradorAction).not.toHaveBeenCalled();
    });

    it("el paso 5 muestra la tasa y Aceptar y pagar llama a iniciarPagoAction", async () => {
      mocks.iniciarPagoAction.mockResolvedValue({
        ok: false,
        error: "No se pudo iniciar el pago. Inténtalo de nuevo.",
      });
      const subidos = ["DNI_AMBAS_CARAS", "FICHA_RUC", "EXTINTORES_PQS", "CAPACITACION_EXTINTORES"].map((tipo) => ({
        tipo,
      })) as unknown as ExpedienteDocumento[];
      await irAlPaso({ ...expediente, nivelRiesgo: "BAJO" }, 5, subidos);
      expect(screen.getByText(/150[.,]00/)).toBeTruthy();
      expect(screen.queryByText("Número de boleta")).toBeNull();
      fireEvent.click(screen.getByLabelText("Acepto la declaración jurada"));
      fireEvent.click(screen.getByRole("button", { name: "Aceptar y pagar" }));
      await waitFor(() => expect(mocks.iniciarPagoAction).toHaveBeenCalled());
      expect((await screen.findByRole("alert")).textContent).toContain("No se pudo iniciar el pago");
    });

    it("con documentos faltantes el botón Aceptar y pagar está bloqueado", async () => {
      await irAlPaso({ ...expediente, nivelRiesgo: "BAJO" }, 5);
      expect(screen.getByText(/Súbelos para poder pagar/)).toBeTruthy();
      expect((screen.getByRole("button", { name: "Aceptar y pagar" }) as HTMLButtonElement).disabled).toBe(true);
    });

    it("un borrador completo abre en el paso 5 y uno incompleto en el paso 1", () => {
      const completo = {
        ...expediente,
        nivelRiesgo: "BAJO",
        solicitanteNombre: "Ana Pérez",
        solicitanteDocumento: "12345678",
        solicitanteTelefono: "999888777",
        solicitanteEmail: "ana@mail.pe",
      } as Expediente;
      const documentos = ["DNI_AMBAS_CARAS", "FICHA_RUC", "EXTINTORES_PQS", "CAPACITACION_EXTINTORES"].map((tipo) => ({
        tipo,
      })) as unknown as ExpedienteDocumento[];
      render(
        <SolicitudWizard
          establecimientos={establecimientos}
          borrador={completo}
          documentos={documentos}
          defaultsSolicitante={defaults}
        />,
      );
      expect(screen.getByText(/Paso 5 de 5/)).toBeTruthy();
      cleanup();
      renderWizard(expediente);
      expect(screen.getByText(/Paso 1 de 5/)).toBeTruthy();
    });

    it("el resumen lista los requeridos del riesgo", async () => {
      await irAlPaso({ ...CHICO, nivelRiesgo: "MEDIO" }, 5);
      expect(screen.getByText("Ficha RUC")).toBeTruthy();
      expect(screen.getAllByText("Pendiente")).toHaveLength(4);
      expect(screen.getByText("DNI (ambas caras, en un solo PDF)")).toBeTruthy();
      expect(screen.getByText("Calidad del solicitante")).toBeTruthy();
      expect(screen.getByText("Propietario")).toBeTruthy();
      expect(screen.getByText(/Faltan documentos obligatorios: DNI [(]ambas caras/)).toBeTruthy();
    });

    it("el resumen de un representante legal lista también la acreditación", async () => {
      await irAlPaso({ ...CHICO, nivelRiesgo: "MEDIO", calidadSolicitante: "REPRESENTANTE_LEGAL" }, 5);
      expect(screen.getByText("Representante legal")).toBeTruthy();
      expect(screen.getAllByText(/Documento que acredita la representación/).length).toBeGreaterThan(0);
      expect(screen.getAllByText("Pendiente")).toHaveLength(5);
    });

    it("el paso 4 no lista el DNI ni la acreditación aunque sean requeridos", async () => {
      await irAlPaso({ ...CHICO, nivelRiesgo: "MEDIO", calidadSolicitante: "ADMINISTRADOR" }, 4);
      expect(screen.queryByText(/DNI [(]ambas caras/)).toBeNull();
      expect(screen.queryByText(/Documento que acredita/)).toBeNull();
      expect(screen.getByText("Ficha RUC")).toBeTruthy();
    });
  });
});
