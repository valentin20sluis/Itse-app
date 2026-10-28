import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  presentarSubsanacion: vi.fn(),
  evaluarSubsanacion: vi.fn(),
}));

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole: mocks.requireRole }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/modules/inspecciones/services/subsanacion.service", () => ({
  presentarSubsanacion: mocks.presentarSubsanacion,
  evaluarSubsanacion: mocks.evaluarSubsanacion,
}));

import { evaluarSubsanacionAction, presentarSubsanacionAction } from "./subsanacion.actions";

const usuario = { id: "u-1", rol: "admin" };
const ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";

const fd = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
};

const MENSAJES: [string, string][] = [
  ["no_encontrado", "No se encontró el expediente."],
  ["no_permitido", "Esa acción no está disponible para este expediente."],
  ["vencido", "El plazo para subsanar venció."],
  ["incompleto", "Sube la declaración jurada y el panel fotográfico antes de presentar."],
  ["sin_evidencia", "El solicitante aún no presentó la subsanación."],
  ["plazo_vencido", 'El plazo venció: solo puedes registrar "Cumple" o "No cumple".'],
  ["motivo_requerido", "No se pudo guardar el cambio. Inténtalo de nuevo."],
  ["conflicto", "El expediente cambió de estado. Actualiza la página e inténtalo de nuevo."],
];

const RUTAS = [
  "/panel/expedientes",
  `/panel/expedientes/${ID}`,
  "/mi-cuenta/expedientes",
  `/mi-cuenta/expedientes/${ID}`,
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue(usuario);
});

describe("presentarSubsanacionAction", () => {
  it("exige el rol cliente primero; si redirige no toca el servicio", async () => {
    mocks.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(presentarSubsanacionAction(ID)).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.requireRole).toHaveBeenCalledWith("cliente");
    expect(mocks.presentarSubsanacion).not.toHaveBeenCalled();
  });

  it("id no uuid", async () => {
    expect(await presentarSubsanacionAction("x")).toEqual({
      ok: false,
      error: "No se encontró el expediente.",
    });
    expect(mocks.presentarSubsanacion).not.toHaveBeenCalled();
  });

  it.each(MENSAJES)("%s: mensaje y sin revalidar", async (status, error) => {
    mocks.presentarSubsanacion.mockResolvedValue({ status });
    expect(await presentarSubsanacionAction(ID)).toEqual({ ok: false, error });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("error inesperado", async () => {
    mocks.presentarSubsanacion.mockRejectedValue(new Error("boom"));
    expect(await presentarSubsanacionAction(ID)).toEqual({
      ok: false,
      error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("ok: usa el usuario de requireRole y revalida las 4 rutas", async () => {
    mocks.presentarSubsanacion.mockResolvedValue({ status: "ok" });
    expect(await presentarSubsanacionAction(ID)).toEqual({ ok: true, data: null });
    expect(mocks.presentarSubsanacion).toHaveBeenCalledWith(usuario, ID);
    expect(mocks.revalidatePath.mock.calls.map((c) => c[0])).toEqual(RUTAS);
  });
});

describe("evaluarSubsanacionAction", () => {
  const form = fd({ resultado: "CUMPLE" });

  it("requireRole primero; si redirige no toca el servicio", async () => {
    mocks.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(evaluarSubsanacionAction(ID, null, form)).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.requireRole).toHaveBeenCalledWith("admin", "superadmin");
    expect(mocks.evaluarSubsanacion).not.toHaveBeenCalled();
  });

  it("id no uuid", async () => {
    expect(await evaluarSubsanacionAction("x", null, form)).toEqual({
      ok: false,
      error: "No se encontró el expediente.",
    });
    expect(mocks.evaluarSubsanacion).not.toHaveBeenCalled();
  });

  it("resultado inválido: fieldErrors, sin servicio", async () => {
    const a = await evaluarSubsanacionAction(ID, null, fd({ resultado: "ANULADO" }));
    expect(!a.ok && a.fieldErrors?.resultado).toEqual(["Elige el resultado."]);
    expect(mocks.evaluarSubsanacion).not.toHaveBeenCalled();
  });

  it.each(MENSAJES)("%s: mensaje y sin revalidar", async (status, error) => {
    mocks.evaluarSubsanacion.mockResolvedValue({ status });
    expect(await evaluarSubsanacionAction(ID, null, form)).toEqual({ ok: false, error });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("error inesperado", async () => {
    mocks.evaluarSubsanacion.mockRejectedValue(new Error("boom"));
    expect(await evaluarSubsanacionAction(ID, null, form)).toEqual({
      ok: false,
      error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
    });
  });

  it("ok: pasa el usuario de requireRole y y revalida", async () => {
    mocks.evaluarSubsanacion.mockResolvedValue({ status: "ok" });
    const r = await evaluarSubsanacionAction(
      ID,
      null,
      fd({ resultado: "SIGUE_EN_SUBSANACION" }),
    );
    expect(r).toEqual({ ok: true, data: null });
    expect(mocks.evaluarSubsanacion).toHaveBeenCalledWith(usuario, ID, {
      resultado: "SIGUE_EN_SUBSANACION",
    });
    expect(mocks.revalidatePath.mock.calls.map((c) => c[0])).toEqual(RUTAS);
  });
});
