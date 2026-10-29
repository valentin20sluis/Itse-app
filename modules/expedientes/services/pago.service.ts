import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { getTasas } from "@/modules/configuracion/services/tasa-lectura.service";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";
import { MONEDA, montoTasa } from "@/modules/expedientes/constants/tasa";
import {
  getExpedienteById,
  guardarSesionPago,
  presentarExpediente,
} from "@/modules/expedientes/services/expediente.service";
import type { Expediente } from "@/modules/expedientes/types/expediente.types";
import { validarMontoPago } from "@/modules/expedientes/utils/pago-monto";
import { tipoItsePorRiesgo } from "@/modules/expedientes/utils/riesgo";

export type CrearSesionResultado = { status: "ok"; url: string } | { status: "no_encontrado" };

export type ConfirmarPagoResultado =
  | { status: "ok"; numero: string }
  | { status: "no_pagado" }
  | { status: "no_encontrado" };

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]+$/;
const uuid = z.uuid();

const NOMBRE_TASA = "Tasa por Inspección Técnica de Seguridad en Edificaciones – ficticia";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "";
}

function urlConfirmacion(sessionId: string): string {
  return `${appUrl()}/mi-cuenta/pago/confirmar?session_id=${sessionId}`;
}

/** Recibe el expediente ya validado por `prepararPago` (BORRADOR completo y propio). */
export async function crearSesionPago(actor: Actor, exp: Expediente): Promise<CrearSesionResultado> {
  if (actor.rol !== "cliente") throw new Error("No autorizado");
  if (!exp.nivelRiesgo) throw new Error("Nivel de riesgo no definido");
  const monto = montoTasa(exp.nivelRiesgo, await getTasas());
  const stripe = getStripe();

  if (exp.stripeSessionId) {
    try {
      const previa = await stripe.checkout.sessions.retrieve(exp.stripeSessionId);
      if (previa.payment_status === "paid") return { status: "ok", url: urlConfirmacion(previa.id) };
      if (previa.status === "open" && previa.amount_total === monto && previa.url) {
        return { status: "ok", url: previa.url };
      }
    } catch {
      // Sesión inexistente o inaccesible: se crea una nueva.
    }
  }

  const sesion = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: MONEDA,
          unit_amount: monto,
          product_data: { name: NOMBRE_TASA },
        },
      },
    ],
    client_reference_id: actor.id,
    metadata: { expedienteId: exp.id, tipoItse: tipoItsePorRiesgo(exp.nivelRiesgo) },
    success_url: `${appUrl()}/mi-cuenta/pago/confirmar?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/mi-cuenta/nueva-solicitud?borrador=${exp.id}`,
  });
  if (!sesion.url) throw new Error("Stripe no devolvió la URL de pago");
  if (!(await guardarSesionPago(actor, exp.id, sesion.id, monto))) return { status: "no_encontrado" };
  return { status: "ok", url: sesion.url };
}

function yaPresentado(exp: Expediente, sessionId: string): ConfirmarPagoResultado {
  if (exp.estado !== "BORRADOR" && exp.stripeSessionId === sessionId && exp.pagadoAt && exp.numero) {
    return { status: "ok", numero: exp.numero };
  }
  return { status: "no_encontrado" };
}

export async function confirmarPago(actor: Actor, sessionId: string): Promise<ConfirmarPagoResultado> {
  if (actor.rol !== "cliente") throw new Error("No autorizado");
  if (!SESSION_ID.test(sessionId)) return { status: "no_encontrado" };

  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.client_reference_id !== actor.id) return { status: "no_encontrado" };
  if (session.payment_status !== "paid") return { status: "no_pagado" };

  const expedienteId = session.metadata?.expedienteId;
  if (!expedienteId || !uuid.safeParse(expedienteId).success) return { status: "no_encontrado" };
  const exp = await getExpedienteById(actor, expedienteId);
  if (!exp || exp.stripeSessionId !== session.id) return { status: "no_encontrado" };

  if (exp.estado !== "BORRADOR") return yaPresentado(exp, session.id);

  if (
    !exp.nivelRiesgo ||
    session.currency?.toLowerCase() !== MONEDA ||
    !validarMontoPago({
      amountTotal: session.amount_total,
      tasaMonto: exp.tasaMonto,
      tipoSesion: session.metadata?.tipoItse,
      tipoActual: tipoItsePorRiesgo(exp.nivelRiesgo),
      montoActual: montoTasa(exp.nivelRiesgo, await getTasas()),
    })
  ) {
    return { status: "no_pagado" };
  }

  const res = await presentarExpediente(actor, exp.id, {
    stripeSessionId: session.id,
    pagadoAt: new Date(),
  });
  if (res.status === "ok" && res.expediente.numero) {
    return { status: "ok", numero: res.expediente.numero };
  }
  const actual = await getExpedienteById(actor, exp.id);
  return actual ? yaPresentado(actual, session.id) : { status: "no_encontrado" };
}
