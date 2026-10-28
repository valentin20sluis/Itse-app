import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  lecturas: [] as unknown[],
  actualizados: [{ id: "x" }] as unknown[],
  sets: [] as Record<string, unknown>[],
  batch: vi.fn(),
}));

function cadena() {
  const c: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit"]) c[m] = () => c;
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

import {
  COMENTARIO_RESOLUCION_NO_CUMPLE,
  generarResolucionNoCumple,
} from "@/modules/certificados/services/resolucion-no-cumple.service";

const admin = { id: "u1", rol: "admin" as const };
const superadmin = { id: "u2", rol: "superadmin" as const };
const cliente = { id: "u3", rol: "cliente" as const };

const exp = (estado: string, extra: Record<string, unknown> = {}) => [
  { estado, numero: "EXP-1", resolucionNumero: null, ...extra },
];
const ahora = new Date("2026-11-01T12:00:00.000Z");

beforeEach(() => {
  h.lecturas = [];
  h.actualizados = [{ id: "x" }];
  h.sets = [];
  h.batch.mockReset();
  h.batch.mockImplementation(async () => [h.actualizados, []]);
});

describe("generarResolucionNoCumple", () => {
  it("lanza para cliente", async () => {
    await expect(generarResolucionNoCumple(cliente, "e", ahora)).rejects.toThrow("No autorizado");
  });

  it("admin: no_permitido sin batch", async () => {
    h.lecturas = [exp("NO_CUMPLE")];
    expect(await generarResolucionNoCumple(admin, "e", ahora)).toEqual({ status: "no_permitido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("no_encontrado: inexistente o sin número", async () => {
    h.lecturas = [[]];
    expect(await generarResolucionNoCumple(superadmin, "e", ahora)).toEqual({ status: "no_encontrado" });
    h.lecturas = [exp("NO_CUMPLE", { numero: null })];
    expect(await generarResolucionNoCumple(superadmin, "e", ahora)).toEqual({ status: "no_encontrado" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it.each([
    ["otro estado", exp("CUMPLE")],
    ["ya tiene resolución", exp("NO_CUMPLE", { resolucionNumero: "RG-2026-0001" })],
  ])("no_permitido: %s, sin batch", async (_nombre, fila) => {
    h.lecturas = [fila];
    expect(await generarResolucionNoCumple(superadmin, "e", ahora)).toEqual({ status: "no_permitido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("ok: un solo batch con update, historial neutro y update de la resolución", async () => {
    h.lecturas = [exp("NO_CUMPLE")];
    expect(await generarResolucionNoCumple(superadmin, "e", ahora)).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(1);
    const [sentencias] = h.batch.mock.calls[0];
    expect(sentencias.map((s: { kind: string }) => s.kind)).toEqual(["update", "insert", "update"]);
    const historial = new PgDialect().sqlToQuery(sentencias[1].q);
    expect(historial.params).toEqual(
      expect.arrayContaining(["NO_CUMPLE", "FINALIZADO", "u2", COMENTARIO_RESOLUCION_NO_CUMPLE]),
    );
    expect(COMENTARIO_RESOLUCION_NO_CUMPLE).not.toMatch(/RG-|\d/);
    const res = h.sets[1];
    expect(res.resolucionNoCumpleAt).toEqual(ahora);
    const numero = new PgDialect().sqlToQuery(res.resolucionNoCumpleNumero as never);
    expect(numero.params).toEqual(expect.arrayContaining(["2026", "RG-2026-%"]));
  });

  it("conflicto: el UPDATE afecta 0 filas (doble clic)", async () => {
    h.lecturas = [exp("NO_CUMPLE")];
    h.actualizados = [];
    expect(await generarResolucionNoCumple(superadmin, "e", ahora)).toEqual({ status: "conflicto" });
  });

  it("reintenta ante 23505 y relanza tras 3 intentos", async () => {
    h.lecturas = [exp("NO_CUMPLE")];
    h.batch.mockRejectedValueOnce({ code: "23505" }).mockResolvedValueOnce([h.actualizados, []]);
    expect(await generarResolucionNoCumple(superadmin, "e", ahora)).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(2);

    h.batch.mockReset().mockRejectedValue({ code: "23505" });
    h.lecturas = [exp("NO_CUMPLE")];
    await expect(generarResolucionNoCumple(superadmin, "e", ahora)).rejects.toEqual({ code: "23505" });
    expect(h.batch).toHaveBeenCalledTimes(3);
  });
});
