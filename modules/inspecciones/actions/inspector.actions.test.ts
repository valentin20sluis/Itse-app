import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setActivo: vi.fn(),
  DuplicadoError: class extends Error {},
}));

vi.mock("@/modules/usuarios/services/authorization.service", () => ({
  requireRole: mocks.requireRole,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/modules/inspecciones/services/inspector.service", () => ({
  createInspector: mocks.create,
  updateInspector: mocks.update,
  setInspectorActivo: mocks.setActivo,
  InspectorDuplicadoError: mocks.DuplicadoError,
}));

import {
  crearInspectorAction,
  editarInspectorAction,
  setInspectorActivoAction,
} from "./inspector.actions";

const usuario = { id: "u-1", rol: "admin" };
const ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";
const NO_ENCONTRADO = "No se encontró el inspector.";

function form(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  const base = {
    nombres: "Ana",
    apellidos: "Quispe",
    documento: "12345678",
    telefono: "987654321",
    email: "ana@example.com",
    profesion: "ARQUITECTO",
    rol: "superadmin",
    ...overrides,
  };
  for (const [k, v] of Object.entries(base)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue(usuario);
});

describe("crearInspectorAction", () => {
  it("si requireRole redirige, no llega al servicio", async () => {
    mocks.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(crearInspectorAction(null, form())).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.requireRole).toHaveBeenCalledWith("admin", "superadmin");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("devuelve fieldErrors y no llama al servicio si es inválido", async () => {
    const r = await crearInspectorAction(null, form({ documento: "1" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.documento).toBeDefined();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("exige la profesión", async () => {
    const r = await crearInspectorAction(null, form({ profesion: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.profesion).toEqual(["Selecciona la profesión."]);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("crea con el usuario de requireRole, revalida y devuelve ok", async () => {
    mocks.create.mockResolvedValue({ id: ID });
    const r = await crearInspectorAction(null, form());
    expect(r).toEqual({ ok: true, data: { id: ID } });
    expect(mocks.create).toHaveBeenCalledWith(
      usuario,
      expect.objectContaining({ documento: expect.any(String), profesion: "ARQUITECTO" }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/panel/inspectores");
  });

  it("mapea duplicado y error inesperado sin revalidar", async () => {
    mocks.create.mockRejectedValueOnce(new mocks.DuplicadoError());
    expect(await crearInspectorAction(null, form())).toEqual({
      ok: false,
      error: "Ya existe un inspector con ese documento.",
    });
    mocks.create.mockRejectedValueOnce(new Error("boom"));
    expect(await crearInspectorAction(null, form())).toEqual({
      ok: false,
      error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("editarInspectorAction", () => {
  it("id no uuid: no encontrado sin tocar el servicio", async () => {
    expect(await editarInspectorAction("x", null, form())).toEqual({
      ok: false,
      error: NO_ENCONTRADO,
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("inexistente: no encontrado y sin revalidar", async () => {
    mocks.update.mockResolvedValue(null);
    expect(await editarInspectorAction(ID, null, form())).toEqual({
      ok: false,
      error: NO_ENCONTRADO,
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("actualiza con el usuario de requireRole", async () => {
    mocks.update.mockResolvedValue({ id: ID });
    const r = await editarInspectorAction(ID, null, form());
    expect(r.ok).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith(usuario, ID, expect.anything());
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/panel/inspectores");
  });
});

describe("setInspectorActivoAction", () => {
  it("si requireRole redirige, no llega al servicio", async () => {
    mocks.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(setInspectorActivoAction(ID, false)).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.setActivo).not.toHaveBeenCalled();
  });

  it("id no uuid: no encontrado sin tocar el servicio", async () => {
    expect(await setInspectorActivoAction("x", false)).toEqual({
      ok: false,
      error: NO_ENCONTRADO,
    });
    expect(mocks.setActivo).not.toHaveBeenCalled();
  });

  it("desactiva y revalida", async () => {
    mocks.setActivo.mockResolvedValue({ id: ID, activo: false });
    const r = await setInspectorActivoAction(ID, false);
    expect(r.ok).toBe(true);
    expect(mocks.setActivo).toHaveBeenCalledWith(usuario, ID, false);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/panel/inspectores");
  });

  it("inexistente: no encontrado", async () => {
    mocks.setActivo.mockResolvedValue(null);
    expect(await setInspectorActivoAction(ID, true)).toEqual({
      ok: false,
      error: NO_ENCONTRADO,
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
