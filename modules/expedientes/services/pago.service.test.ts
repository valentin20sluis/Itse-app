import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  create: vi.fn(),
  getExpedienteById: vi.fn(),
  guardarSesionPago: vi.fn(),
  presentarExpediente: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { retrieve: mocks.retrieve, create: mocks.create } } }),
}));
vi.mock("@/modules/expedientes/services/expediente.service", () => ({
  getExpedienteById: mocks.getExpedienteById,
  guardarSesionPago: mocks.guardarSesionPago,
  presentarExpediente: mocks.presentarExpediente,
}));

import { MONEDA, montoTasa } from "@/modules/expedientes/constants/tasa";
import type { Expediente } from "@/modules/expedientes/types/expediente.types";
import { confirmarPago, crearSesionPago } from "./pago.service";

const actor = { id: "u-1", rol: "cliente" as const };
const EXP_ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";
const SID = "cs_test_abc123";

const borrador = (extra: Partial<Expediente> = {}) =>
  ({
    id: EXP_ID,
    estado: "BORRADOR",
    nivelRiesgo: "ALTO",
    stripeSessionId: null,
    pagadoAt: null,
    numero: null,
    ...extra,
  }) as Expediente;

const sesionPagada = (extra: Record<string, unknown> = {}) => ({
  id: SID,
  payment_status: "paid",
  amount_total: montoTasa("ALTO"),
  currency: MONEDA,
  client_reference_id: "u-1",
  metadata: { expedienteId: EXP_ID },
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  mocks.guardarSesionPago.mockResolvedValue(true);
});

describe("montoTasa", () => {
  it.each([
    ["BAJO", 15000],
    ["MEDIO", 15000],
    ["ALTO", 30000],
    ["MUY_ALTO", 30000],
  ] as const)("%s cuesta %i céntimos", (nivel, monto) => {
    expect(montoTasa(nivel)).toBe(monto);
  });
});

describe("crearSesionPago", () => {
  it("crea la sesión con monto del nivel guardado y guarda su id", async () => {
    mocks.create.mockResolvedValue({ id: SID, url: "https://stripe.test/pay" });
    const res = await crearSesionPago(actor, borrador());
    expect(res).toEqual({ status: "ok", url: "https://stripe.test/pay" });
    const args = mocks.create.mock.calls[0][0];
    expect(args.mode).toBe("payment");
    expect(args.line_items).toHaveLength(1);
    expect(args.line_items[0].price_data.currency).toBe(MONEDA);
    expect(args.line_items[0].price_data.unit_amount).toBe(30000);
    expect(args.client_reference_id).toBe("u-1");
    expect(args.metadata).toEqual({ expedienteId: EXP_ID });
    expect(args.success_url).toBe(
      "http://localhost:3000/mi-cuenta/pago/confirmar?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(args.cancel_url).toBe(`http://localhost:3000/mi-cuenta/nueva-solicitud?borrador=${EXP_ID}`);
    expect(mocks.guardarSesionPago).toHaveBeenCalledWith(actor, EXP_ID, SID);
  });

  it("sesión guardada pagada: devuelve la URL de confirmación sin crear otra", async () => {
    mocks.retrieve.mockResolvedValue({ id: SID, payment_status: "paid" });
    const res = await crearSesionPago(actor, borrador({ stripeSessionId: SID }));
    expect(res).toEqual({
      status: "ok",
      url: `http://localhost:3000/mi-cuenta/pago/confirmar?session_id=${SID}`,
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("sesión abierta con el mismo monto: reutiliza su URL", async () => {
    mocks.retrieve.mockResolvedValue({
      id: SID,
      payment_status: "unpaid",
      status: "open",
      amount_total: 30000,
      url: "https://stripe.test/open",
    });
    const res = await crearSesionPago(actor, borrador({ stripeSessionId: SID }));
    expect(res).toEqual({ status: "ok", url: "https://stripe.test/open" });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each([
    ["expirada", { status: "expired", amount_total: 30000, url: null }],
    ["con otro monto", { status: "open", amount_total: 15000, url: "https://stripe.test/old" }],
  ])("sesión %s: crea una nueva", async (_n, previa) => {
    mocks.retrieve.mockResolvedValue({ id: SID, payment_status: "unpaid", ...previa });
    mocks.create.mockResolvedValue({ id: "cs_test_new", url: "https://stripe.test/new" });
    const res = await crearSesionPago(actor, borrador({ stripeSessionId: SID }));
    expect(res).toEqual({ status: "ok", url: "https://stripe.test/new" });
    expect(mocks.guardarSesionPago).toHaveBeenCalledWith(actor, EXP_ID, "cs_test_new");
  });

  it("sesión inexistente: crea una nueva", async () => {
    mocks.retrieve.mockRejectedValue(new Error("No such session"));
    mocks.create.mockResolvedValue({ id: "cs_test_new", url: "https://stripe.test/new" });
    const res = await crearSesionPago(actor, borrador({ stripeSessionId: SID }));
    expect(res.status).toBe("ok");
  });

  it("sin nivel de riesgo no llama a Stripe", async () => {
    await expect(crearSesionPago(actor, borrador({ nivelRiesgo: null }))).rejects.toThrow();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });
});

describe("confirmarPago", () => {
  it("sesión pagada y propia: presenta y devuelve el número", async () => {
    mocks.retrieve.mockResolvedValue(sesionPagada());
    mocks.getExpedienteById.mockResolvedValue(borrador({ stripeSessionId: SID }));
    mocks.presentarExpediente.mockResolvedValue({
      status: "ok",
      expediente: { numero: "EXP-2026-00001" },
    });
    const res = await confirmarPago(actor, SID);
    expect(res).toEqual({ status: "ok", numero: "EXP-2026-00001" });
    expect(mocks.presentarExpediente).toHaveBeenCalledWith(actor, EXP_ID, {
      stripeSessionId: SID,
      pagadoAt: expect.any(Date),
    });
  });

  it("formato inválido: no llama a Stripe", async () => {
    expect((await confirmarPago(actor, "abc")).status).toBe("no_encontrado");
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });

  it.each([
    ["sesión de otro usuario", sesionPagada({ client_reference_id: "u-2" }), borrador({ stripeSessionId: SID }), "no_encontrado"],
    ["sin pagar", sesionPagada({ payment_status: "unpaid" }), borrador({ stripeSessionId: SID }), "no_pagado"],
    ["expedienteId no uuid", sesionPagada({ metadata: { expedienteId: "x" } }), borrador({ stripeSessionId: SID }), "no_encontrado"],
    ["monto menor al del riesgo actual", sesionPagada({ amount_total: 15000 }), borrador({ stripeSessionId: SID }), "no_pagado"],
    ["monto mayor al del riesgo actual", sesionPagada({ amount_total: 30000 }), borrador({ stripeSessionId: SID, nivelRiesgo: "BAJO" }), "no_pagado"],
    ["moneda distinta", sesionPagada({ currency: "usd" }), borrador({ stripeSessionId: SID }), "no_pagado"],
    ["expediente ajeno", sesionPagada(), null, "no_encontrado"],
    ["sesión distinta de la guardada", sesionPagada(), borrador({ stripeSessionId: "cs_test_otra" }), "no_encontrado"],
  ])("%s: no presenta", async (_n, sesion, exp, status) => {
    mocks.retrieve.mockResolvedValue(sesion);
    mocks.getExpedienteById.mockResolvedValue(exp);
    expect((await confirmarPago(actor, SID)).status).toBe(status);
    expect(mocks.presentarExpediente).not.toHaveBeenCalled();
  });

  it("ya presentado con la misma sesión: devuelve su número sin presentar de nuevo", async () => {
    mocks.retrieve.mockResolvedValue(sesionPagada());
    mocks.getExpedienteById.mockResolvedValue(
      borrador({ estado: "PRESENTADO", stripeSessionId: SID, pagadoAt: new Date(), numero: "EXP-2026-00007" }),
    );
    expect(await confirmarPago(actor, SID)).toEqual({ status: "ok", numero: "EXP-2026-00007" });
    expect(mocks.presentarExpediente).not.toHaveBeenCalled();
  });

  it("carrera: presentar devuelve no_encontrado y se relee el expediente presentado", async () => {
    mocks.retrieve.mockResolvedValue(sesionPagada());
    mocks.getExpedienteById
      .mockResolvedValueOnce(borrador({ stripeSessionId: SID }))
      .mockResolvedValueOnce(
        borrador({ estado: "PRESENTADO", stripeSessionId: SID, pagadoAt: new Date(), numero: "EXP-2026-00009" }),
      );
    mocks.presentarExpediente.mockResolvedValue({ status: "no_encontrado" });
    expect(await confirmarPago(actor, SID)).toEqual({ status: "ok", numero: "EXP-2026-00009" });
  });
});
