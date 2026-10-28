import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  designarInspectores: vi.fn(),
}));

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole: mocks.requireRole }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/modules/inspecciones/services/designacion.service", () => ({
  designarInspectores: mocks.designarInspectores,
}));

import { designarInspectoresAction } from "./designacion.actions";

const usuario = { id: "u-1", rol: "admin" };
const ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";
const I1 = "11111111-1111-4111-8111-111111111111";
const I2 = "22222222-2222-4222-8222-222222222222";

const fd = (ids: string[]) => {
  const f = new FormData();
  for (const i of ids) f.append("inspectorIds", i);
  return f;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue(usuario);
});

describe("designarInspectoresAction", () => {
  it("requireRole primero; si redirige no toca el servicio", async () => {
    mocks.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(designarInspectoresAction(ID, null, fd([I1]))).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.requireRole).toHaveBeenCalledWith("admin", "superadmin");
    expect(mocks.designarInspectores).not.toHaveBeenCalled();
  });

  it("id no uuid", async () => {
    expect(await designarInspectoresAction("x", null, fd([I1]))).toEqual({
      ok: false,
      error: "No se encontró el expediente.",
    });
    expect(mocks.designarInspectores).not.toHaveBeenCalled();
  });

  it("entrada inválida: no llama al servicio", async () => {
    const r = await designarInspectoresAction(ID, null, fd([]));
    expect(r.ok).toBe(false);
    expect(mocks.designarInspectores).not.toHaveBeenCalled();
  });

  it.each([
    ["no_encontrado", "No se encontró el expediente."],
    ["no_permitido", "Esa acción no está disponible para este expediente."],
    ["cantidad_invalida", "Elige la cantidad exacta de inspectores que pide el nivel de riesgo."],
    ["inspector_invalido", "Alguno de los inspectores ya no está disponible. Actualiza la página."],
    ["conflicto", "Los datos cambiaron. Actualiza la página e inténtalo de nuevo."],
  ])("%s: mensaje y sin revalidar", async (status, error) => {
    mocks.designarInspectores.mockResolvedValue({ status });
    expect(await designarInspectoresAction(ID, null, fd([I1]))).toEqual({ ok: false, error });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("error inesperado", async () => {
    mocks.designarInspectores.mockRejectedValue(new Error("boom"));
    expect(await designarInspectoresAction(ID, null, fd([I1]))).toEqual({
      ok: false,
      error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("ok: pasa el usuario de requireRole y revalida las 4 rutas", async () => {
    mocks.designarInspectores.mockResolvedValue({ status: "ok" });
    expect(await designarInspectoresAction(ID, null, fd([I1, I2]))).toEqual({ ok: true, data: null });
    expect(mocks.designarInspectores).toHaveBeenCalledWith(usuario, ID, [I1, I2]);
    expect(mocks.revalidatePath.mock.calls.map((c) => c[0])).toEqual([
      "/panel/expedientes",
      `/panel/expedientes/${ID}`,
      "/mi-cuenta/expedientes",
      `/mi-cuenta/expedientes/${ID}`,
    ]);
  });
});
