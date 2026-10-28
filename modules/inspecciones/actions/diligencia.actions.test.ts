import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  programarDiligencia: vi.fn(),
  registrarResultadoDiligencia: vi.fn(),
}));

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole: mocks.requireRole }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/modules/inspecciones/services/diligencia.service", () => ({
  programarDiligencia: mocks.programarDiligencia,
  registrarResultadoDiligencia: mocks.registrarResultadoDiligencia,
}));

import { programarDiligenciaAction, registrarResultadoAction } from "./diligencia.actions";

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
  ["conflicto", "El expediente cambió de estado. Actualiza la página e inténtalo de nuevo."],
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue(usuario);
});

describe("programarDiligenciaAction", () => {
  const form = fd({ programadaPara: "2026-11-03" });

  it("requireRole primero; si redirige no toca el servicio", async () => {
    mocks.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(programarDiligenciaAction(ID, null, form)).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.requireRole).toHaveBeenCalledWith("admin", "superadmin");
    expect(mocks.programarDiligencia).not.toHaveBeenCalled();
  });

  it("id no uuid", async () => {
    expect(await programarDiligenciaAction("x", null, form)).toEqual({
      ok: false,
      error: "No se encontró el expediente.",
    });
    expect(mocks.programarDiligencia).not.toHaveBeenCalled();
  });

  it("fecha con formato inválido: fieldErrors, sin servicio", async () => {
    const r = await programarDiligenciaAction(ID, null, fd({ programadaPara: "2026-02-31" }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.fieldErrors?.programadaPara).toBeDefined();
    expect(mocks.programarDiligencia).not.toHaveBeenCalled();
  });

  it.each([
    ...MENSAJES,
    ["fecha_invalida", "Elige una fecha desde hoy, dentro de los próximos 90 días."],
  ])("%s: mensaje y sin revalidar", async (status, error) => {
    mocks.programarDiligencia.mockResolvedValue({ status });
    expect(await programarDiligenciaAction(ID, null, form)).toEqual({ ok: false, error });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("error inesperado", async () => {
    mocks.programarDiligencia.mockRejectedValue(new Error("boom"));
    expect(await programarDiligenciaAction(ID, null, form)).toEqual({
      ok: false,
      error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("ok: usuario de requireRole y 4 rutas revalidadas", async () => {
    mocks.programarDiligencia.mockResolvedValue({ status: "ok" });
    expect(await programarDiligenciaAction(ID, null, form)).toEqual({ ok: true, data: null });
    const [u, id, fecha] = mocks.programarDiligencia.mock.calls[0];
    expect([u, id]).toEqual([usuario, ID]);
    expect((fecha as Date).toISOString()).toBe("2026-11-03T05:00:00.000Z");
    expect(mocks.revalidatePath.mock.calls.map((c) => c[0])).toEqual([
      "/panel/expedientes",
      `/panel/expedientes/${ID}`,
      "/mi-cuenta/expedientes",
      `/mi-cuenta/expedientes/${ID}`,
    ]);
  });
});

describe("registrarResultadoAction", () => {
  const form = fd({ resultado: "CUMPLE" });

  it("requireRole primero; si redirige no toca el servicio", async () => {
    mocks.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(registrarResultadoAction(ID, null, form)).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.registrarResultadoDiligencia).not.toHaveBeenCalled();
  });

  it("id no uuid", async () => {
    expect(await registrarResultadoAction("x", null, form)).toEqual({
      ok: false,
      error: "No se encontró el expediente.",
    });
    expect(mocks.registrarResultadoDiligencia).not.toHaveBeenCalled();
  });

  it("resultado inválido: fieldErrors, sin servicio", async () => {
    const a = await registrarResultadoAction(ID, null, fd({ resultado: "ANULADO" }));
    expect(!a.ok && a.fieldErrors?.resultado).toBeDefined();
    expect(mocks.registrarResultadoDiligencia).not.toHaveBeenCalled();
  });

  it.each([
    ...MENSAJES,
    ["motivo_requerido", "No se pudo guardar el cambio. Inténtalo de nuevo."],
    ["observaciones_requeridas", "Agrega al menos una observación."],
    ["observacion_invalida", "Una de las observaciones elegidas no es válida."],
    [
      "observacion_relevante",
      "Hay observaciones relevantes: en una inspección posterior solo se puede registrar \"No cumple\".",
    ],
    [
      "reprogramacion_invalida",
      "Elige la nueva fecha de inspección: desde hoy y dentro del plazo de subsanación (hasta 20 días hábiles).",
    ],
  ])("%s: mensaje y sin revalidar", async (status, error) => {
    mocks.registrarResultadoDiligencia.mockResolvedValue({ status });
    expect(await registrarResultadoAction(ID, null, form)).toEqual({ ok: false, error });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("error inesperado", async () => {
    mocks.registrarResultadoDiligencia.mockRejectedValue(new Error("boom"));
    expect(await registrarResultadoAction(ID, null, form)).toEqual({
      ok: false,
      error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
    });
  });

  it("ok: pasa el usuario de requireRole y revalida", async () => {
    mocks.registrarResultadoDiligencia.mockResolvedValue({ status: "ok" });
    expect(await registrarResultadoAction(ID, null, fd({ resultado: "NO_CUMPLE" }))).toEqual({
      ok: true,
      data: null,
    });
    expect(mocks.registrarResultadoDiligencia).toHaveBeenCalledWith(usuario, ID, {
      resultado: "NO_CUMPLE",
      codigos: [],
      libres: [],
      reprogramadaPara: undefined,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(4);
  });

  it("suspensión: lee codigo con getAll, libres por línea y la fecha de Lima", async () => {
    mocks.registrarResultadoDiligencia.mockResolvedValue({ status: "ok" });
    const f = new FormData();
    f.append("resultado", "EN_SUBSANACION");
    f.append("codigo", "EXTINTORES");
    f.append("codigo", "COLOCAR_SENALIZACION");
    f.append("libres", "Grieta en la columna\r\n\n  Humedad en el techo  ");
    f.append("reprogramadaPara", "2026-11-10");
    expect(await registrarResultadoAction(ID, null, f)).toEqual({ ok: true, data: null });
    const [, , input] = mocks.registrarResultadoDiligencia.mock.calls[0];
    expect(input).toMatchObject({
      resultado: "EN_SUBSANACION",
      codigos: ["EXTINTORES", "COLOCAR_SENALIZACION"],
      libres: ["Grieta en la columna", "Humedad en el techo"],
    });
    expect(input.reprogramadaPara.toISOString()).toBe("2026-11-10T05:00:00.000Z");
  });

  it("suspensión sin observaciones: error de campo, sin servicio", async () => {
    const r = await registrarResultadoAction(ID, null, fd({ resultado: "EN_SUBSANACION" }));
    expect(!r.ok && r.fieldErrors?.codigos).toBeDefined();
    expect(mocks.registrarResultadoDiligencia).not.toHaveBeenCalled();
  });
});
