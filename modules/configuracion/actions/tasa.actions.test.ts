import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  guardarTasas: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole: m.requireRole }));
vi.mock("@/modules/configuracion/services/tasa-gestion.service", () => ({ guardarTasas: m.guardarTasas }));

import { guardarTasasAction } from "@/modules/configuracion/actions/tasa.actions";

const actor = { id: "s1", rol: "superadmin" };
const form = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
};

beforeEach(() => {
  vi.resetAllMocks();
  m.requireRole.mockResolvedValue(actor);
});

describe("guardarTasasAction", () => {
  it("si requireRole rechaza, no llama al servicio", async () => {
    m.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(guardarTasasAction(form({ posterior: "150", previa: "300" }))).rejects.toThrow("NEXT_REDIRECT");
    expect(m.guardarTasas).not.toHaveBeenCalled();
  });

  it("pide el rol superadmin", async () => {
    m.guardarTasas.mockResolvedValue({ ok: true, data: { POSTERIOR: 15000, PREVIA: 30000 } });
    await guardarTasasAction(form({ posterior: "150", previa: "300" }));
    expect(m.requireRole).toHaveBeenCalledWith("superadmin");
  });

  it("datos inválidos: fieldErrors por campo y sin servicio", async () => {
    const r = await guardarTasasAction(form({ posterior: "1", previa: "abc" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors ?? {}).sort()).toEqual(["posterior", "previa"]);
    expect(m.guardarTasas).not.toHaveBeenCalled();
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("éxito: manda céntimos al servicio y revalida ambas rutas", async () => {
    const data = { POSTERIOR: 15050, PREVIA: 30000 };
    m.guardarTasas.mockResolvedValue({ ok: true, data });
    expect(await guardarTasasAction(form({ posterior: "150,5", previa: "300" }))).toEqual({ ok: true, data });
    expect(m.guardarTasas).toHaveBeenCalledWith(actor, { posterior: 15050, previa: 30000 });
    expect(m.revalidatePath).toHaveBeenCalledWith("/panel/configuracion/tasas");
    expect(m.revalidatePath).toHaveBeenCalledWith("/mi-cuenta/nueva-solicitud");
  });

  it("error del servicio: se propaga sin revalidar", async () => {
    m.guardarTasas.mockResolvedValue({ ok: false, error: "No hay cambios que guardar." });
    expect(await guardarTasasAction(form({ posterior: "150", previa: "300" }))).toEqual({
      ok: false,
      error: "No hay cambios que guardar.",
    });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("excepción inesperada: mensaje genérico sin revalidar", async () => {
    m.guardarTasas.mockRejectedValue(new Error("boom"));
    expect(await guardarTasasAction(form({ posterior: "150", previa: "300" }))).toEqual({
      ok: false,
      error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
    });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});
