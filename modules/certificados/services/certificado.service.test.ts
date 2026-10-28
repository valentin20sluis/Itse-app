import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const h = vi.hoisted(() => ({
  lecturas: [] as unknown[],
  actualizados: [{ id: "x" }] as unknown[],
  batch: vi.fn(),
}));

function cadena() {
  const c: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "innerJoin"]) c[m] = () => c;
  c.then = (res: (v: unknown) => unknown) => res(h.lecturas.shift());
  return c;
}

vi.mock("@/db", () => ({
  db: {
    select: () => cadena(),
    update: () => ({ set: () => ({ where: () => ({ returning: () => ({ kind: "update" }) }) }) }),
    insert: () => ({ select: (q: unknown) => ({ kind: "insert", q }) }),
    batch: h.batch,
  },
}));

import {
  COMENTARIO_GENERADO,
  getResumenCertificado,
  prepararCertificado,
} from "@/modules/certificados/services/certificado.service";

const admin = { id: "u1", rol: "admin" as const };
const superadmin = { id: "u2", rol: "superadmin" as const };
const cliente = { id: "u3", rol: "cliente" as const };

const exp = (estado: string, numero: string | null = "EXP-1", nivelRiesgo: string | null = "BAJO") => [
  { estado, numero, nivelRiesgo },
];
const ahora = new Date("2026-11-01T12:00:00.000Z");
const texto = (q: unknown) => new PgDialect().sqlToQuery(q as never);

beforeEach(() => {
  h.lecturas = [];
  h.actualizados = [{ id: "x" }];
  h.batch.mockReset();
  h.batch.mockImplementation(async () => [h.actualizados, [], []]);
});

describe("prepararCertificado", () => {
  it("lanza para cliente", async () => {
    await expect(prepararCertificado(cliente, "e", ahora)).rejects.toThrow("No autorizado");
  });

  it("no_encontrado: inexistente o sin número", async () => {
    h.lecturas = [[]];
    expect(await prepararCertificado(admin, "e", ahora)).toEqual({ status: "no_encontrado" });
    h.lecturas = [exp("CUMPLE", null)];
    expect(await prepararCertificado(admin, "e", ahora)).toEqual({ status: "no_encontrado" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it.each([["EN_SUBSANACION", "BAJO"], ["CERTIFICADO_PENDIENTE_FIRMA", "BAJO"], ["CUMPLE", null]])(
    "no_permitido (%s, riesgo %s), sin batch",
    async (estado, riesgo) => {
      h.lecturas = [exp(estado as string, "EXP-1", riesgo)];
      expect(await prepararCertificado(admin, "e", ahora)).toEqual({ status: "no_permitido" });
      expect(h.batch).not.toHaveBeenCalled();
    },
  );

  it.each([admin, superadmin])("ok para %o: un solo batch con update, historial e insert del certificado", async (actor) => {
    h.lecturas = [exp("CUMPLE")];
    expect(await prepararCertificado(actor, "e", ahora)).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(1);
    const [sentencias] = h.batch.mock.calls[0];
    expect(sentencias.map((s: { kind: string }) => s.kind)).toEqual(["update", "insert", "insert"]);
    const historial = texto(sentencias[1].q);
    expect(historial.params).toEqual(
      expect.arrayContaining(["CUMPLE", "CERTIFICADO_PENDIENTE_FIRMA", actor.id, COMENTARIO_GENERADO]),
    );
    const cert = texto(sentencias[2].q);
    expect(cert.sql).toContain("exists (");
    expect(cert.sql).toContain("from certificados where numero like");
    expect(cert.params).toEqual(expect.arrayContaining(["%-2026", "2026"]));
    const codigo = cert.params.find((p) => typeof p === "string" && /^[0-9A-Z]{12}$/.test(p));
    expect(codigo).toBeDefined();
  });

  it("conflicto: el UPDATE afecta 0 filas (doble clic)", async () => {
    h.lecturas = [exp("CUMPLE")];
    h.actualizados = [];
    expect(await prepararCertificado(admin, "e", ahora)).toEqual({ status: "conflicto" });
    expect(h.batch).toHaveBeenCalledTimes(1);
  });

  it("reintenta ante 23505 con un código nuevo y relanza tras 3 intentos", async () => {
    h.lecturas = [exp("CUMPLE")];
    h.batch.mockRejectedValueOnce({ code: "23505" }).mockResolvedValueOnce([h.actualizados, [], []]);
    expect(await prepararCertificado(admin, "e", ahora)).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(2);
    const codigos = h.batch.mock.calls.map(
      ([s]) => texto(s[2].q).params.find((p) => typeof p === "string" && /^[0-9A-Z]{12}$/.test(p)),
    );
    expect(codigos[0]).not.toBe(codigos[1]);

    h.batch.mockReset().mockRejectedValue({ cause: { code: "23505" } });
    h.lecturas = [exp("CUMPLE")];
    await expect(prepararCertificado(admin, "e", ahora)).rejects.toEqual({ cause: { code: "23505" } });
    expect(h.batch).toHaveBeenCalledTimes(3);
  });

  it("otros errores se relanzan de inmediato", async () => {
    h.lecturas = [exp("CUMPLE")];
    h.batch.mockReset().mockRejectedValue(new Error("boom"));
    await expect(prepararCertificado(admin, "e", ahora)).rejects.toThrow("boom");
    expect(h.batch).toHaveBeenCalledTimes(1);
  });
});

describe("getResumenCertificado", () => {
  const venceAt = new Date("2028-11-01T05:00:00.000Z");
  const fila = (estado: string, usuarioId = "u3", extra = {}) => [
    { numero: "0001-2026", emitidoAt: ahora, venceAt, estado, usuarioId, ...extra },
  ];

  it("null si no hay fila", async () => {
    h.lecturas = [[]];
    expect(await getResumenCertificado(admin, "e", ahora)).toBeNull();
  });

  it("el personal ve el resumen siempre que exista, sin código", async () => {
    h.lecturas = [fila("CERTIFICADO_PENDIENTE_FIRMA", "u3", { emitidoAt: null, venceAt: null })];
    expect(await getResumenCertificado(admin, "e", ahora)).toEqual({
      numero: "0001-2026",
      emitidoAt: null,
      venceAt: null,
      estado: null,
    });
    h.lecturas = [fila("FINALIZADO")];
    const r = await getResumenCertificado(superadmin, "e", ahora);
    expect(r).toEqual({ numero: "0001-2026", emitidoAt: ahora, venceAt, estado: "VIGENTE" });
    expect(r).not.toHaveProperty("codigo");
  });

  it("anulado se muestra como REVOCADO", async () => {
    h.lecturas = [fila("ANULADO")];
    expect((await getResumenCertificado(admin, "e", ahora))?.estado).toBe("REVOCADO");
  });

  it("cliente propio solo en ENTREGADO; ajeno siempre null", async () => {
    h.lecturas = [fila("FINALIZADO")];
    expect(await getResumenCertificado(cliente, "e", ahora)).toBeNull();
    h.lecturas = [fila("ENTREGADO")];
    expect((await getResumenCertificado(cliente, "e", ahora))?.numero).toBe("0001-2026");
    h.lecturas = [fila("ENTREGADO", "otro")];
    expect(await getResumenCertificado(cliente, "e", ahora)).toBeNull();
  });
});
