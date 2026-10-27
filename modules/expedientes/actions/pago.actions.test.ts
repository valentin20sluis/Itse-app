import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  prepararPago: vi.fn(),
  crearSesionPago: vi.fn(),
}));

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole: mocks.requireRole }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/modules/expedientes/services/expediente.service", () => ({ prepararPago: mocks.prepararPago }));
vi.mock("@/modules/expedientes/services/pago.service", () => ({ crearSesionPago: mocks.crearSesionPago }));

import { iniciarPagoAction } from "./pago.actions";

const usuario = { id: "u-1", rol: "cliente" };
const ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";
const NO_SOLICITUD = { ok: false, error: "No se encontró la solicitud." };

const fd = (aceptada = true) => {
  const f = new FormData();
  if (aceptada) f.set("aceptada", "on");
  return f;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue(usuario);
  mocks.redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});

describe("iniciarPagoAction", () => {
  it("si requireRole redirige, no toca el servicio", async () => {
    mocks.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(iniciarPagoAction(ID, null, fd())).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.requireRole).toHaveBeenCalledWith("cliente");
    expect(mocks.prepararPago).not.toHaveBeenCalled();
  });

  it("id no uuid", async () => {
    expect(await iniciarPagoAction("x", null, fd())).toEqual(NO_SOLICITUD);
    expect(mocks.prepararPago).not.toHaveBeenCalled();
  });

  it("declaración sin aceptar", async () => {
    const res = await iniciarPagoAction(ID, null, fd(false));
    expect(res.ok).toBe(false);
    expect(mocks.prepararPago).not.toHaveBeenCalled();
  });

  it("incompleto lista lo que falta en español", async () => {
    mocks.prepararPago.mockResolvedValue({ status: "incompleto", faltantes: ["paso3", "declaracion"] });
    expect(await iniciarPagoAction(ID, null, fd())).toEqual({
      ok: false,
      error: "Aún falta completar: Solicitante, Declaración jurada.",
    });
  });

  it("no_encontrado", async () => {
    mocks.prepararPago.mockResolvedValue({ status: "no_encontrado" });
    expect(await iniciarPagoAction(ID, null, fd())).toEqual(NO_SOLICITUD);
  });

  it("éxito: revalida y redirige a Stripe", async () => {
    mocks.prepararPago.mockResolvedValue({ status: "ok", expediente: { id: ID } });
    mocks.crearSesionPago.mockResolvedValue({ status: "ok", url: "https://stripe.test/pay" });
    await expect(iniciarPagoAction(ID, null, fd())).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.prepararPago).toHaveBeenCalledWith(usuario, ID, true);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/mi-cuenta/expedientes");
    expect(mocks.redirect).toHaveBeenCalledWith("https://stripe.test/pay");
  });

  it("error de Stripe: mensaje genérico sin redirigir", async () => {
    mocks.prepararPago.mockResolvedValue({ status: "ok", expediente: { id: ID } });
    mocks.crearSesionPago.mockRejectedValue(new Error("stripe boom"));
    expect(await iniciarPagoAction(ID, null, fd())).toEqual({
      ok: false,
      error: "No se pudo iniciar el pago. Inténtalo de nuevo.",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
