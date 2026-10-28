import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  crearFeriado: vi.fn(),
  editarFeriado: vi.fn(),
  eliminarFeriado: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole: m.requireRole }));
vi.mock("@/modules/configuracion/services/feriado-gestion.service", () => ({
  crearFeriado: m.crearFeriado,
  editarFeriado: m.editarFeriado,
  eliminarFeriado: m.eliminarFeriado,
}));

import {
  crearFeriadoAction,
  editarFeriadoAction,
  eliminarFeriadoAction,
} from "@/modules/configuracion/actions/feriado.actions";

const actor = { id: "s1", rol: "superadmin" };
const form = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
};
const validos = { fecha: "2026-12-25", nombre: "Navidad" };

beforeEach(() => {
  vi.resetAllMocks();
  m.requireRole.mockResolvedValue(actor);
});

describe("autorización", () => {
  it("si requireRole rechaza, ninguna acción llama al servicio", async () => {
    m.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(crearFeriadoAction(form(validos))).rejects.toThrow("NEXT_REDIRECT");
    await expect(editarFeriadoAction("2026-12-25", form({ nombre: "Otro" }))).rejects.toThrow("NEXT_REDIRECT");
    await expect(eliminarFeriadoAction("2026-12-25")).rejects.toThrow("NEXT_REDIRECT");
    expect(m.crearFeriado).not.toHaveBeenCalled();
    expect(m.editarFeriado).not.toHaveBeenCalled();
    expect(m.eliminarFeriado).not.toHaveBeenCalled();
  });

  it("pide el rol superadmin", async () => {
    m.eliminarFeriado.mockResolvedValue({ ok: true, data: validos });
    await eliminarFeriadoAction("2026-12-25");
    expect(m.requireRole).toHaveBeenCalledWith("superadmin");
  });
});

describe("crearFeriadoAction", () => {
  it("datos inválidos: fieldErrors por campo y sin servicio", async () => {
    const r = await crearFeriadoAction(form({ fecha: "2026-02-30", nombre: "ab" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors ?? {}).sort()).toEqual(["fecha", "nombre"]);
    expect(m.crearFeriado).not.toHaveBeenCalled();
  });

  it("éxito: llama al servicio con los datos limpios y revalida la página", async () => {
    m.crearFeriado.mockResolvedValue({ ok: true, data: validos });
    const r = await crearFeriadoAction(form({ ...validos, nombre: "  Navidad " }));
    expect(r).toEqual({ ok: true, data: validos });
    expect(m.crearFeriado).toHaveBeenCalledWith(actor, validos);
    expect(m.revalidatePath).toHaveBeenCalledWith("/panel/configuracion/feriados");
  });

  it("error del servicio: se propaga sin revalidar", async () => {
    m.crearFeriado.mockResolvedValue({ ok: false, error: "Ya existe un feriado en esa fecha." });
    expect(await crearFeriadoAction(form(validos))).toEqual({
      ok: false,
      error: "Ya existe un feriado en esa fecha.",
    });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("excepción inesperada: mensaje genérico", async () => {
    m.crearFeriado.mockRejectedValue(new Error("boom"));
    expect(await crearFeriadoAction(form(validos))).toEqual({
      ok: false,
      error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
    });
  });
});

describe("editarFeriadoAction", () => {
  it("nombre inválido: fieldErrors y sin servicio", async () => {
    const r = await editarFeriadoAction("2026-12-25", form({ nombre: "a" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.nombre).toBeDefined();
    expect(m.editarFeriado).not.toHaveBeenCalled();
  });

  it("fecha mal formada: no encontrado sin servicio", async () => {
    expect(await editarFeriadoAction("basura", form({ nombre: "Navidad" }))).toEqual({
      ok: false,
      error: "No se encontró el feriado.",
    });
    expect(m.editarFeriado).not.toHaveBeenCalled();
  });

  it("éxito revalida", async () => {
    m.editarFeriado.mockResolvedValue({ ok: true, data: validos });
    await editarFeriadoAction("2026-12-25", form({ nombre: "Navidad" }));
    expect(m.editarFeriado).toHaveBeenCalledWith(actor, "2026-12-25", "Navidad");
    expect(m.revalidatePath).toHaveBeenCalledWith("/panel/configuracion/feriados");
  });
});

describe("eliminarFeriadoAction", () => {
  it("éxito revalida y error no", async () => {
    m.eliminarFeriado.mockResolvedValueOnce({ ok: true, data: validos });
    await eliminarFeriadoAction("2026-12-25");
    expect(m.revalidatePath).toHaveBeenCalledTimes(1);
    m.eliminarFeriado.mockResolvedValueOnce({ ok: false, error: "No se encontró el feriado." });
    await eliminarFeriadoAction("2026-12-25");
    expect(m.revalidatePath).toHaveBeenCalledTimes(1);
  });

  it("fecha mal formada: no llama al servicio", async () => {
    expect((await eliminarFeriadoAction("x")).ok).toBe(false);
    expect(m.eliminarFeriado).not.toHaveBeenCalled();
  });
});
