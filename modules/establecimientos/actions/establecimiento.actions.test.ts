import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  archive: vi.fn(),
  ConExpedientesError: class extends Error {},
}));

vi.mock("@/modules/usuarios/services/authorization.service", () => ({
  requireRole: mocks.requireRole,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/modules/establecimientos/services/establecimiento.service", () => ({
  createEstablecimiento: mocks.create,
  updateEstablecimiento: mocks.update,
  archiveEstablecimiento: mocks.archive,
  EstablecimientoConExpedientesError: mocks.ConExpedientesError,
}));

import {
  archiveEstablecimientoAction,
  createEstablecimientoAction,
  updateEstablecimientoAction,
} from "./establecimiento.actions";

const usuario = { id: "u-1", rol: "cliente" };
const ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";
const NO_ENCONTRADO = "No se encontró el establecimiento.";

function form(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  const base = {
    nombreComercial: "Bodega Don Pepe",
    direccion: "Av. Lima 123",
    distrito: "Miraflores",
    numeroGiro: "G-123",
    funcion: "COMERCIO",
    giro: "Bodega",
    areaM2: "120.5",
    numeroPisos: "2",
    pisoEstablecimiento: "1",
    ...overrides,
  };
  for (const [k, v] of Object.entries(base)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue(usuario);
});

describe("createEstablecimientoAction", () => {
  it("si requireRole redirige, no llega al servicio", async () => {
    mocks.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(createEstablecimientoAction(null, form())).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.requireRole).toHaveBeenCalledWith("cliente");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("datos inválidos devuelven fieldErrors y no llaman al servicio", async () => {
    const res = await createEstablecimientoAction(null, form({ nombreComercial: "", numeroPisos: "0" }));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.fieldErrors?.nombreComercial?.[0]).toMatch(/nombre comercial/);
      expect(res.fieldErrors?.numeroPisos).toBeDefined();
    }
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("numeroGiro vacío o inválido devuelve fieldErrors y no llama al servicio", async () => {
    for (const numeroGiro of ["", "12 34"]) {
      const res = await createEstablecimientoAction(null, form({ numeroGiro }));
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.fieldErrors?.numeroGiro).toBeDefined();
    }
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("pisoEstablecimiento vacío o mayor que los pisos devuelve fieldErrors; válido pasa al servicio al crear y editar", async () => {
    for (const pisoEstablecimiento of ["", "3"]) {
      const res = await createEstablecimientoAction(null, form({ pisoEstablecimiento }));
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.fieldErrors?.pisoEstablecimiento).toBeDefined();
    }
    expect(mocks.create).not.toHaveBeenCalled();
    mocks.create.mockResolvedValue({ id: ID });
    mocks.update.mockResolvedValue({ id: ID });
    await createEstablecimientoAction(null, form({ pisoEstablecimiento: "2" }));
    expect(mocks.create).toHaveBeenCalledWith(usuario, expect.objectContaining({ pisoEstablecimiento: 2 }));
    await updateEstablecimientoAction(ID, null, form({ pisoEstablecimiento: "2" }));
    expect(mocks.update).toHaveBeenCalledWith(usuario, ID, expect.objectContaining({ pisoEstablecimiento: 2 }));
  });

  it("pasa numeroGiro al servicio", async () => {
    mocks.create.mockResolvedValue({ id: ID });
    await createEstablecimientoAction(null, form());
    expect(mocks.create).toHaveBeenCalledWith(
      usuario,
      expect.objectContaining({ numeroGiro: "G-123" }),
    );
  });

  it("funcion vacía o fuera de la lista devuelve fieldErrors y no llama al servicio", async () => {
    for (const funcion of ["", "MINERIA"]) {
      const res = await createEstablecimientoAction(null, form({ funcion }));
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.fieldErrors?.funcion?.[0]).toBe("Selecciona la función del establecimiento.");
    }
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("pasa funcion al servicio al crear y al editar", async () => {
    mocks.create.mockResolvedValue({ id: ID });
    mocks.update.mockResolvedValue({ id: ID });
    await createEstablecimientoAction(null, form({ funcion: "SALUD" }));
    expect(mocks.create).toHaveBeenCalledWith(usuario, expect.objectContaining({ funcion: "SALUD" }));
    await updateEstablecimientoAction(ID, null, form({ funcion: "OFICINAS_ADMINISTRATIVAS" }));
    expect(mocks.update).toHaveBeenCalledWith(
      usuario,
      ID,
      expect.objectContaining({ funcion: "OFICINAS_ADMINISTRATIVAS" }),
    );
  });

  it("usa el usuario de requireRole aunque el formulario traiga usuarioId, y revalida", async () => {
    mocks.create.mockResolvedValue({ id: ID });
    const res = await createEstablecimientoAction(null, form({ usuarioId: "otro" }));
    expect(res).toEqual({ ok: true, data: { id: ID } });
    expect(mocks.create).toHaveBeenCalledWith(
      usuario,
      expect.not.objectContaining({ usuarioId: expect.anything() }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/mi-cuenta/establecimientos");
  });

  it("error inesperado devuelve mensaje genérico sin revalidar", async () => {
    mocks.create.mockRejectedValue(new Error("db"));
    const res = await createEstablecimientoAction(null, form());
    expect(res).toEqual({
      ok: false,
      error: "No se pudo completar la operación. Inténtalo de nuevo.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateEstablecimientoAction", () => {
  it("id no uuid: no encontrado sin llamar al servicio", async () => {
    const res = await updateEstablecimientoAction("abc", null, form());
    expect(res).toEqual({ ok: false, error: NO_ENCONTRADO });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("datos inválidos devuelven fieldErrors", async () => {
    const res = await updateEstablecimientoAction(ID, null, form({ areaM2: "0" }));
    expect(res.ok).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("servicio devuelve null: no encontrado y no revalida", async () => {
    mocks.update.mockResolvedValue(null);
    const res = await updateEstablecimientoAction(ID, null, form());
    expect(res).toEqual({ ok: false, error: NO_ENCONTRADO });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("éxito llama al servicio con el usuario y revalida", async () => {
    mocks.update.mockResolvedValue({ id: ID });
    const res = await updateEstablecimientoAction(ID, null, form());
    expect(res.ok).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith(usuario, ID, expect.any(Object));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/mi-cuenta/establecimientos");
  });
});

describe("archiveEstablecimientoAction", () => {
  it("llama requireRole('cliente') y rechaza id no uuid sin consultar", async () => {
    const res = await archiveEstablecimientoAction("xyz");
    expect(mocks.requireRole).toHaveBeenCalledWith("cliente");
    expect(res).toEqual({ ok: false, error: NO_ENCONTRADO });
    expect(mocks.archive).not.toHaveBeenCalled();
  });

  it("servicio devuelve null: no encontrado y no revalida", async () => {
    mocks.archive.mockResolvedValue(null);
    const res = await archiveEstablecimientoAction(ID);
    expect(res).toEqual({ ok: false, error: NO_ENCONTRADO });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("con expedientes en trámite devuelve el mensaje del error tipado sin revalidar", async () => {
    mocks.archive.mockRejectedValue(new mocks.ConExpedientesError());
    const res = await archiveEstablecimientoAction(ID);
    expect(res).toEqual({
      ok: false,
      error: "No puedes archivar un establecimiento con expedientes en trámite.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("éxito devuelve el id y revalida", async () => {
    mocks.archive.mockResolvedValue({ id: ID, nombreComercial: "x" });
    const res = await archiveEstablecimientoAction(ID);
    expect(res).toEqual({ ok: true, data: { id: ID } });
    expect(mocks.archive).toHaveBeenCalledWith(usuario, ID);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/mi-cuenta/establecimientos");
  });
});
