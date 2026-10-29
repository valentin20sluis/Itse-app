import { isValidElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
const listOwnEstablecimientos = vi.hoisted(() => vi.fn());
const getExpedienteById = vi.hoisted(() => vi.fn());
const listDocumentos = vi.hoisted(() => vi.fn());
const getTasas = vi.hoisted(() => vi.fn());
vi.mock("@/modules/configuracion/services/tasa-lectura.service", () => ({ getTasas }));

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("@/modules/establecimientos/services/establecimiento.service", () => ({
  listOwnEstablecimientos,
}));
const listEstablecimientosOcupados = vi.hoisted(() => vi.fn());
vi.mock("@/modules/expedientes/services/expediente.service", () => ({
  getExpedienteById,
  listEstablecimientosOcupados,
}));
vi.mock("@/modules/expedientes/services/documento.service", () => ({ listDocumentos }));
vi.mock("@/modules/expedientes/components/SolicitudWizard", () => ({
  SolicitudWizard: () => null,
}));

import { EmptyState } from "@/components/shared/EmptyState";
import { SolicitudWizard } from "@/modules/expedientes/components/SolicitudWizard";
import NuevaSolicitudPage from "./page";

const usuario = {
  id: "u1",
  nombres: "Ana",
  apellidos: "Pérez",
  documento: null,
  telefono: "999",
  email: "ana@x.pe",
};
const ID = "123e4567-e89b-42d3-a456-426614174000";

async function render(borrador?: string) {
  const el = (await NuevaSolicitudPage({
    searchParams: Promise.resolve({ borrador }),
  })) as ReactElement<{ children: ReactElement[] }>;
  return el.props.children[1] as ReactElement<Record<string, unknown>>;
}

describe("/mi-cuenta/nueva-solicitud", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireRole.mockResolvedValue(usuario);
    listOwnEstablecimientos.mockResolvedValue([{ id: "e1" }]);
    listEstablecimientosOcupados.mockResolvedValue([]);
    getTasas.mockResolvedValue({ POSTERIOR: 15000, PREVIA: 30000 });
  });

  it("pasa los establecimientos ocupados excluyendo el borrador cargado", async () => {
    getExpedienteById.mockResolvedValue({ id: ID, estado: "BORRADOR" });
    listDocumentos.mockResolvedValue([]);
    listEstablecimientosOcupados.mockResolvedValue(["e2"]);

    const wizard = await render(ID);

    expect(listEstablecimientosOcupados).toHaveBeenCalledWith(usuario, ID);
    expect(wizard.props.establecimientosOcupados).toEqual(["e2"]);
  });

  it("exige cliente antes de leer datos y no consulta nada si redirige", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(render()).rejects.toThrow("NEXT_REDIRECT");
    expect(listOwnEstablecimientos).not.toHaveBeenCalled();
    expect(getExpedienteById).not.toHaveBeenCalled();
  });

  it("sin establecimientos muestra el estado vacío", async () => {
    listOwnEstablecimientos.mockResolvedValue([]);

    const child = await render();

    expect(isValidElement(child) && child.type).toBe(EmptyState);
    expect(getExpedienteById).not.toHaveBeenCalled();
  });

  it("solicitud nueva con datos del solicitante", async () => {
    const wizard = await render();

    expect(wizard.type).toBe(SolicitudWizard);
    expect(wizard.props.borrador).toBeNull();
    expect(wizard.props.documentos).toEqual([]);
    expect(wizard.props.tasas).toEqual({ POSTERIOR: 15000, PREVIA: 30000 });
    expect(wizard.props.defaultsSolicitante).toEqual({
      nombre: "Ana Pérez",
      documento: "",
      telefono: "999",
      email: "ana@x.pe",
    });
  });

  it("borrador no uuid se ignora sin consultar", async () => {
    const wizard = await render("abc");

    expect(getExpedienteById).not.toHaveBeenCalled();
    expect(wizard.props.borrador).toBeNull();
  });

  it("borrador propio en BORRADOR se carga con sus documentos", async () => {
    const exp = { id: ID, estado: "BORRADOR" };
    getExpedienteById.mockResolvedValue(exp);
    listDocumentos.mockResolvedValue([{ id: "d1" }]);

    const wizard = await render(ID);

    expect(getExpedienteById).toHaveBeenCalledWith(usuario, ID);
    expect(wizard.props.borrador).toBe(exp);
    expect(wizard.props.documentos).toEqual([{ id: "d1" }]);
  });

  it("servicio null se trata como solicitud nueva", async () => {
    getExpedienteById.mockResolvedValue(null);

    const wizard = await render(ID);

    expect(wizard.props.borrador).toBeNull();
    expect(listDocumentos).not.toHaveBeenCalled();
  });

  it("borrador en otro estado se ignora", async () => {
    getExpedienteById.mockResolvedValue({ id: ID, estado: "PRESENTADO" });

    const wizard = await render(ID);

    expect(wizard.props.borrador).toBeNull();
    expect(listDocumentos).not.toHaveBeenCalled();
  });
});
