import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  createBorrador: vi.fn(),
  updateBorrador: vi.fn(),
  enviarExpediente: vi.fn(),
}));

vi.mock("@/modules/usuarios/services/authorization.service", () => ({
  requireRole: mocks.requireRole,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/modules/expedientes/services/expediente.service", () => ({
  createBorrador: mocks.createBorrador,
  updateBorrador: mocks.updateBorrador,
  enviarExpediente: mocks.enviarExpediente,
}));

import { enviarSolicitudAction, saveBorradorAction } from "./expediente.actions";

const usuario = { id: "u-1", rol: "cliente" };
const ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";
const EST = "7a1c2d3e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";
const NO_SOLICITUD = { ok: false, error: "No se encontró la solicitud." };

function fd(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

const paso1 = (extra: Record<string, string> = {}) =>
  fd({ establecimientoId: EST, tipoTramite: "NUEVA", ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue(usuario);
});

describe("saveBorradorAction", () => {
  it("si requireRole redirige, no llega al servicio", async () => {
    mocks.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(saveBorradorAction(1, null, null, paso1())).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.requireRole).toHaveBeenCalledWith("cliente");
    expect(mocks.createBorrador).not.toHaveBeenCalled();
  });

  it("paso 1 sin id crea el borrador con el usuario de requireRole, ignorando usuarioId", async () => {
    mocks.createBorrador.mockResolvedValue({ id: ID });
    const res = await saveBorradorAction(1, null, null, paso1({ usuarioId: "otro" }));
    expect(res).toEqual({ ok: true, data: { id: ID } });
    expect(mocks.createBorrador).toHaveBeenCalledWith(usuario, {
      establecimientoId: EST,
      tipoTramite: "NUEVA",
    });
  });

  it("paso 1 con establecimiento ajeno: no encontrado el establecimiento", async () => {
    mocks.createBorrador.mockResolvedValue(null);
    const res = await saveBorradorAction(1, null, null, paso1());
    expect(res).toEqual({ ok: false, error: "No se encontró el establecimiento." });
  });

  it("paso 1 con id actualiza", async () => {
    mocks.updateBorrador.mockResolvedValue({ id: ID });
    const res = await saveBorradorAction(1, ID, null, paso1());
    expect(res.ok).toBe(true);
    expect(mocks.updateBorrador).toHaveBeenCalledWith(usuario, ID, expect.any(Object));
  });

  it("paso 2 pasa usoMixtoPatrimonio y granEscala al servicio", async () => {
    mocks.updateBorrador.mockResolvedValue({ id: ID });
    await saveBorradorAction(
      2,
      ID,
      null,
      fd({ nivelRiesgo: "ALTO", usoMixtoPatrimonio: "on", granEscala: "on" }),
    );
    expect(mocks.updateBorrador).toHaveBeenCalledWith(
      usuario,
      ID,
      expect.objectContaining({ usoMixtoPatrimonio: true, granEscala: true }),
    );
  });

  it("pasos 2 a 4 sin id responden no encontrado", async () => {
    const res = await saveBorradorAction(2, null, null, fd({ nivelRiesgo: "BAJO" }));
    expect(res).toEqual(NO_SOLICITUD);
    expect(mocks.createBorrador).not.toHaveBeenCalled();
  });

  it("paso fuera de rango y id no uuid responden no encontrado sin llamar al servicio", async () => {
    expect(await saveBorradorAction(5 as 1, ID, null, paso1())).toEqual(NO_SOLICITUD);
    expect(await saveBorradorAction(1, "abc", null, paso1())).toEqual(NO_SOLICITUD);
    expect(mocks.updateBorrador).not.toHaveBeenCalled();
  });

  it("datos inválidos devuelven fieldErrors sin llamar al servicio", async () => {
    const res = await saveBorradorAction(3, ID, null, fd({ solicitanteNombre: "" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.solicitanteNombre).toBeDefined();
    expect(mocks.updateBorrador).not.toHaveBeenCalled();
  });

  it("servicio devuelve null (ajeno o no BORRADOR): no encontrado", async () => {
    mocks.updateBorrador.mockResolvedValue(null);
    expect(await saveBorradorAction(4, ID, null, fd({ numeroBoleta: "B-001" }))).toEqual(
      NO_SOLICITUD,
    );
  });

  it("error inesperado: mensaje genérico", async () => {
    mocks.updateBorrador.mockRejectedValue(new Error("db"));
    expect(await saveBorradorAction(1, ID, null, paso1())).toEqual({
      ok: false,
      error: "No se pudo completar la operación. Inténtalo de nuevo.",
    });
  });
});

describe("enviarSolicitudAction", () => {
  it("id no uuid: no encontrado sin consultar", async () => {
    const res = await enviarSolicitudAction("abc", null, fd({ aceptada: "on" }));
    expect(mocks.requireRole).toHaveBeenCalledWith("cliente");
    expect(res).toEqual(NO_SOLICITUD);
    expect(mocks.enviarExpediente).not.toHaveBeenCalled();
  });

  it("sin declaración devuelve fieldErrors", async () => {
    const res = await enviarSolicitudAction(ID, null, fd({}));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.aceptada).toBeDefined();
    expect(mocks.enviarExpediente).not.toHaveBeenCalled();
  });

  it("incompleto lista pasos y documentos en español, sin revalidar", async () => {
    mocks.enviarExpediente.mockResolvedValue({
      status: "incompleto",
      faltantes: ["paso3", "PLANOS_ELECTRICOS"],
    });
    const res = await enviarSolicitudAction(ID, null, fd({ aceptada: "on" }));
    expect(res).toEqual({
      ok: false,
      error: "Aún falta completar: Solicitante, Planos eléctricos.",
    });
    expect(mocks.enviarExpediente).toHaveBeenCalledWith(usuario, ID, true);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("no_encontrado (ajeno): mensaje genérico de solicitud", async () => {
    mocks.enviarExpediente.mockResolvedValue({ status: "no_encontrado" });
    expect(await enviarSolicitudAction(ID, null, fd({ aceptada: "on" }))).toEqual(NO_SOLICITUD);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("éxito devuelve id y número y revalida", async () => {
    mocks.enviarExpediente.mockResolvedValue({
      status: "ok",
      expediente: { id: ID, numero: "EXP-2026-00001" },
    });
    const res = await enviarSolicitudAction(ID, null, fd({ aceptada: "on" }));
    expect(res).toEqual({ ok: true, data: { id: ID, numero: "EXP-2026-00001" } });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/mi-cuenta/expedientes");
  });

  it("error inesperado: mensaje genérico", async () => {
    mocks.enviarExpediente.mockRejectedValue(new Error("db"));
    const res = await enviarSolicitudAction(ID, null, fd({ aceptada: "on" }));
    expect(res).toEqual({
      ok: false,
      error: "No se pudo completar la operación. Inténtalo de nuevo.",
    });
  });
});
