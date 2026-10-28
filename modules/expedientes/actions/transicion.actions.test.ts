import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  cambiarEstado: vi.fn(),
  actualizarRiesgo: vi.fn(),
}));

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole: mocks.requireRole }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/modules/expedientes/services/transicion.service", () => ({
  cambiarEstado: mocks.cambiarEstado,
  actualizarRiesgo: mocks.actualizarRiesgo,
}));

import { actualizarRiesgoAction, cambiarEstadoAction } from "./transicion.actions";

const usuario = { id: "u-1", rol: "admin" };
const ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";
const NO_EXP = { ok: false, error: "No se encontró el expediente." };

const fd = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
};
const estadoFd = fd({ hasta: "OBSERVADO_REQUISITOS", comentario: "Falta el plano de ubicación" });
const riesgoFd = fd({ nivelRiesgo: "ALTO", nota: "Por el aforo declarado" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue(usuario);
});

describe.each([
  ["cambiarEstadoAction", cambiarEstadoAction, mocks.cambiarEstado, estadoFd],
  ["actualizarRiesgoAction", actualizarRiesgoAction, mocks.actualizarRiesgo, riesgoFd],
])("%s", (_n, action, servicio, valido) => {
  it("requireRole primero; si redirige no toca el servicio", async () => {
    mocks.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(action(ID, null, valido)).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.requireRole).toHaveBeenCalledWith("admin", "superadmin");
    expect(servicio).not.toHaveBeenCalled();
  });

  it("id no uuid", async () => {
    expect(await action("x", null, valido)).toEqual(NO_EXP);
    expect(servicio).not.toHaveBeenCalled();
  });

  it("validación: devuelve fieldErrors sin llamar al servicio", async () => {
    const res = await action(ID, null, fd({}));
    expect(res.ok).toBe(false);
    expect(!res.ok && res.fieldErrors).toBeTruthy();
    expect(servicio).not.toHaveBeenCalled();
  });

  it.each([
    ["no_encontrado", "No se encontró el expediente."],
    ["no_permitido", "Esa acción no está disponible para este expediente."],
    ["conflicto", "El expediente cambió de estado. Actualiza la página e inténtalo de nuevo."],
  ])("mapea %s sin revalidar", async (status, error) => {
    servicio.mockResolvedValue({ status });
    expect(await action(ID, null, valido)).toEqual({ ok: false, error });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("error inesperado: mensaje genérico", async () => {
    servicio.mockRejectedValue(new Error("db boom"));
    expect(await action(ID, null, valido)).toEqual({
      ok: false,
      error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("éxito: usa el usuario de requireRole y revalida 4 rutas", async () => {
    servicio.mockResolvedValue({ status: "ok" });
    expect(await action(ID, null, valido)).toEqual({ ok: true, data: null });
    expect(servicio.mock.calls[0][0]).toBe(usuario);
    expect(servicio.mock.calls[0][1]).toBe(ID);
    expect(mocks.revalidatePath.mock.calls.map((c) => c[0])).toEqual([
      "/panel/expedientes",
      `/panel/expedientes/${ID}`,
      "/mi-cuenta/expedientes",
      `/mi-cuenta/expedientes/${ID}`,
    ]);
  });
});
