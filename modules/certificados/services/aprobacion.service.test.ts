import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const h = vi.hoisted(() => ({
  lecturas: [] as unknown[],
  actualizados: [{ id: "x" }] as unknown[],
  sets: [] as Record<string, unknown>[],
  batch: vi.fn(),
}));

function cadena() {
  const c: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "leftJoin"]) c[m] = () => c;
  c.then = (res: (v: unknown) => unknown) => res(h.lecturas.shift());
  return c;
}

vi.mock("@/db", () => ({
  db: {
    select: () => cadena(),
    update: () => ({
      set: (v: Record<string, unknown>) => {
        h.sets.push(v);
        return { where: () => ({ kind: "update", returning: () => ({ kind: "update" }) }) };
      },
    }),
    insert: () => ({ select: (q: unknown) => ({ kind: "insert", q }) }),
    batch: h.batch,
  },
}));

import { aprobarCertificado, COMENTARIO_APROBADO } from "@/modules/certificados/services/aprobacion.service";
import { calcularVencimiento } from "@/modules/certificados/utils/vigencia";

const admin = { id: "u1", rol: "admin" as const };
const superadmin = { id: "u2", rol: "superadmin" as const };
const cliente = { id: "u3", rol: "cliente" as const };

const exp = (estado: string, extra: Record<string, unknown> = {}) => [
  { estado, numero: "EXP-1", certificadoId: "c1", emitidoAt: null, ...extra },
];
const ahora = new Date("2026-11-01T12:00:00.000Z");

beforeEach(() => {
  h.lecturas = [];
  h.actualizados = [{ id: "x" }];
  h.sets = [];
  h.batch.mockReset();
  h.batch.mockImplementation(async () => [h.actualizados, []]);
});

describe("aprobarCertificado", () => {
  it("lanza para cliente", async () => {
    await expect(aprobarCertificado(cliente, "e", ahora)).rejects.toThrow("No autorizado");
  });

  it("admin: no_permitido sin batch", async () => {
    h.lecturas = [exp("CERTIFICADO_PENDIENTE_FIRMA")];
    expect(await aprobarCertificado(admin, "e", ahora)).toEqual({ status: "no_permitido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("no_encontrado: inexistente o sin número", async () => {
    h.lecturas = [[]];
    expect(await aprobarCertificado(superadmin, "e", ahora)).toEqual({ status: "no_encontrado" });
    h.lecturas = [exp("CERTIFICADO_PENDIENTE_FIRMA", { numero: null })];
    expect(await aprobarCertificado(superadmin, "e", ahora)).toEqual({ status: "no_encontrado" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it.each([
    ["otro estado", exp("CUMPLE")],
    ["sin fila en certificados", exp("CERTIFICADO_PENDIENTE_FIRMA", { certificadoId: null })],
    ["ya emitido", exp("CERTIFICADO_PENDIENTE_FIRMA", { emitidoAt: ahora })],
  ])("no_permitido: %s, sin batch", async (_nombre, fila) => {
    h.lecturas = [fila];
    expect(await aprobarCertificado(superadmin, "e", ahora)).toEqual({ status: "no_permitido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("ok: un solo batch con update, historial y update del certificado", async () => {
    h.lecturas = [exp("CERTIFICADO_PENDIENTE_FIRMA")];
    expect(await aprobarCertificado(superadmin, "e", ahora)).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(1);
    const [sentencias] = h.batch.mock.calls[0];
    expect(sentencias.map((s: { kind: string }) => s.kind)).toEqual(["update", "insert", "update"]);
    const historial = new PgDialect().sqlToQuery(sentencias[1].q);
    expect(historial.params).toEqual(
      expect.arrayContaining(["CERTIFICADO_PENDIENTE_FIRMA", "FINALIZADO", "u2", COMENTARIO_APROBADO]),
    );
    const cert = h.sets[1];
    expect(cert.emitidoAt).toEqual(ahora);
    expect(cert.resolucionAt).toEqual(ahora);
    expect(cert.venceAt).toEqual(calcularVencimiento(ahora));
    const numero = new PgDialect().sqlToQuery(cert.resolucionNumero as never);
    expect(numero.sql).toContain("resolucion_numero like");
    expect(numero.params).toEqual(expect.arrayContaining(["2026", "RG-2026-%"]));
  });

  it("conflicto: el UPDATE afecta 0 filas (doble clic)", async () => {
    h.lecturas = [exp("CERTIFICADO_PENDIENTE_FIRMA")];
    h.actualizados = [];
    expect(await aprobarCertificado(superadmin, "e", ahora)).toEqual({ status: "conflicto" });
  });

  it("reintenta ante 23505 y relanza tras 3 intentos", async () => {
    h.lecturas = [exp("CERTIFICADO_PENDIENTE_FIRMA")];
    h.batch.mockRejectedValueOnce({ code: "23505" }).mockResolvedValueOnce([h.actualizados, []]);
    expect(await aprobarCertificado(superadmin, "e", ahora)).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(2);

    h.batch.mockReset().mockRejectedValue({ code: "23505" });
    h.lecturas = [exp("CERTIFICADO_PENDIENTE_FIRMA")];
    await expect(aprobarCertificado(superadmin, "e", ahora)).rejects.toEqual({ code: "23505" });
    expect(h.batch).toHaveBeenCalledTimes(3);
  });
});
