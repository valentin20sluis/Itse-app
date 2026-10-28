import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  crearObservacion: vi.fn(),
  editarObservacion: vi.fn(),
  setObservacionActiva: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole: m.requireRole }));
vi.mock("@/modules/configuracion/services/catalogo-gestion.service", () => ({
  crearObservacion: m.crearObservacion,
  editarObservacion: m.editarObservacion,
  setObservacionActiva: m.setObservacionActiva,
}));

import {
  crearObservacionAction,
  editarObservacionAction,
  setObservacionActivaAction,
} from "@/modules/configuracion/actions/catalogo.actions";

const actor = { id: "s1", rol: "superadmin" };
const ID = "3f1b2c4e-5a6d-4e8f-9a0b-1c2d3e4f5a6b";
const item = { id: ID, descripcion: "Retirar cajas de la salida", activo: true };
const form = (descripcion: string) => {
  const f = new FormData();
  f.set("descripcion", descripcion);
  return f;
};

beforeEach(() => {
  vi.resetAllMocks();
  m.requireRole.mockResolvedValue(actor);
});

describe("autorización", () => {
  it("si requireRole rechaza, ninguna acción llama al servicio", async () => {
    m.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(crearObservacionAction(form(item.descripcion))).rejects.toThrow("NEXT_REDIRECT");
    await expect(editarObservacionAction(ID, form(item.descripcion))).rejects.toThrow("NEXT_REDIRECT");
    await expect(setObservacionActivaAction(ID, false)).rejects.toThrow("NEXT_REDIRECT");
    expect(m.crearObservacion).not.toHaveBeenCalled();
    expect(m.editarObservacion).not.toHaveBeenCalled();
    expect(m.setObservacionActiva).not.toHaveBeenCalled();
  });

  it("pide el rol superadmin", async () => {
    m.setObservacionActiva.mockResolvedValue({ ok: true, data: item });
    await setObservacionActivaAction(ID, false);
    expect(m.requireRole).toHaveBeenCalledWith("superadmin");
  });
});

describe("crearObservacionAction", () => {
  it("descripción inválida: fieldErrors y sin servicio", async () => {
    const r = await crearObservacionAction(form("corta"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.descripcion).toBeDefined();
    expect(m.crearObservacion).not.toHaveBeenCalled();
  });

  it("éxito: llama al servicio con la descripción recortada y revalida", async () => {
    m.crearObservacion.mockResolvedValue({ ok: true, data: item });
    const r = await crearObservacionAction(form("  Retirar cajas de la salida "));
    expect(r).toEqual({ ok: true, data: item });
    expect(m.crearObservacion).toHaveBeenCalledWith(actor, "Retirar cajas de la salida");
    expect(m.revalidatePath).toHaveBeenCalledWith("/panel/configuracion/catalogo");
  });

  it("error del servicio: se propaga sin revalidar", async () => {
    m.crearObservacion.mockResolvedValue({ ok: false, error: "Ya existe una observación con esa descripción." });
    expect(await crearObservacionAction(form(item.descripcion))).toEqual({
      ok: false,
      error: "Ya existe una observación con esa descripción.",
    });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("excepción inesperada: mensaje genérico", async () => {
    m.crearObservacion.mockRejectedValue(new Error("boom"));
    expect(await crearObservacionAction(form(item.descripcion))).toEqual({
      ok: false,
      error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
    });
  });
});

describe("editarObservacionAction", () => {
  it("id que no es uuid: no encontrada sin servicio", async () => {
    expect(await editarObservacionAction("basura", form(item.descripcion))).toEqual({
      ok: false,
      error: "No se encontró la observación.",
    });
    expect(m.editarObservacion).not.toHaveBeenCalled();
  });

  it("descripción inválida: fieldErrors y sin servicio", async () => {
    const r = await editarObservacionAction(ID, form(""));
    expect(r.ok).toBe(false);
    expect(m.editarObservacion).not.toHaveBeenCalled();
  });

  it("éxito revalida", async () => {
    m.editarObservacion.mockResolvedValue({ ok: true, data: item });
    await editarObservacionAction(ID, form(item.descripcion));
    expect(m.editarObservacion).toHaveBeenCalledWith(actor, ID, item.descripcion);
    expect(m.revalidatePath).toHaveBeenCalledWith("/panel/configuracion/catalogo");
  });
});

describe("setObservacionActivaAction", () => {
  it("éxito revalida y error no", async () => {
    m.setObservacionActiva.mockResolvedValueOnce({ ok: true, data: item });
    await setObservacionActivaAction(ID, false);
    expect(m.setObservacionActiva).toHaveBeenCalledWith(actor, ID, false);
    expect(m.revalidatePath).toHaveBeenCalledTimes(1);
    m.setObservacionActiva.mockResolvedValueOnce({ ok: false, error: "No se encontró la observación." });
    await setObservacionActivaAction(ID, true);
    expect(m.revalidatePath).toHaveBeenCalledTimes(1);
  });

  it("id inválido o estado que no es booleano: no llama al servicio", async () => {
    expect((await setObservacionActivaAction("x", false)).ok).toBe(false);
    expect((await setObservacionActivaAction(ID, "false" as never)).ok).toBe(false);
    expect(m.setObservacionActiva).not.toHaveBeenCalled();
  });
});
