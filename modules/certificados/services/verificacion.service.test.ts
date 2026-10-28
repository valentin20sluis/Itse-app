import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ lecturas: [] as unknown[], consultas: 0 }));

function cadena() {
  h.consultas++;
  const c: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "innerJoin"]) c[m] = () => c;
  c.then = (res: (v: unknown) => unknown) => res(h.lecturas.shift());
  return c;
}

vi.mock("@/db", () => ({ db: { select: () => cadena() } }));

import { verificarCertificado } from "@/modules/certificados/services/verificacion.service";

const AHORA = new Date("2027-01-10T15:00:00.000Z");
const fila = (extra: Record<string, unknown> = {}) => ({
  numero: "0001-2026",
  emitidoAt: new Date("2026-11-01T15:00:00.000Z"),
  venceAt: new Date("2028-11-01T05:00:00.000Z"),
  estado: "ENTREGADO",
  nombreComercial: "Bodega Sol",
  distrito: "Distrito Uno",
  ...extra,
});

beforeEach(() => {
  h.lecturas = [];
  h.consultas = 0;
});

describe("verificarCertificado", () => {
  it.each(["", "ABC", "ABCD-EFGH-JKM!", "ABCDEFGHJKMNP"])(
    "código inválido %j no consulta la base",
    async (c) => {
      expect(await verificarCertificado(c, AHORA)).toEqual({ status: "no_encontrado" });
      expect(h.consultas).toBe(0);
    },
  );

  it("sin fila o sin emisión: no_encontrado", async () => {
    h.lecturas = [[]];
    expect((await verificarCertificado("ABCDEFGHJKMN", AHORA)).status).toBe("no_encontrado");
    h.lecturas = [[fila({ emitidoAt: null })]];
    expect((await verificarCertificado("ABCDEFGHJKMN", AHORA)).status).toBe("no_encontrado");
  });

  it.each([
    ["FINALIZADO", "ok"],
    ["ENTREGADO", "ok"],
    ["ANULADO", "ok"],
    ["CERTIFICADO_PENDIENTE_FIRMA", "no_encontrado"],
    ["CUMPLE", "no_encontrado"],
    ["NO_CUMPLE", "no_encontrado"],
    ["EN_REVISION", "no_encontrado"],
  ])("expediente en %s: %s", async (estado, esperado) => {
    h.lecturas = [[fila({ estado })]];
    expect((await verificarCertificado("ABCDEFGHJKMN", AHORA)).status).toBe(esperado);
  });

  it("calcula los 4 estados", async () => {
    const caso = async (extra: Record<string, unknown>) => {
      h.lecturas = [[fila(extra)]];
      const r = await verificarCertificado("abcd-efgh-jkmn", AHORA);
      return r.status === "ok" ? r.data.estado : null;
    };
    expect(await caso({})).toBe("VIGENTE");
    expect(await caso({ venceAt: new Date("2027-02-01T05:00:00.000Z") })).toBe("POR_VENCER");
    expect(await caso({ venceAt: new Date("2027-01-01T05:00:00.000Z") })).toBe("VENCIDO");
    expect(await caso({ estado: "ANULADO" })).toBe("REVOCADO");
  });

  it("devuelve exactamente las claves permitidas", async () => {
    h.lecturas = [[fila({ usuarioId: "x", documento: "1", expedienteNumero: "EXP-1", codigo: "C" })]];
    const r = await verificarCertificado("abcd efgh jkmn", AHORA);
    expect(r.status).toBe("ok");
    if (r.status === "ok") {
      expect(Object.keys(r.data).sort()).toEqual(
        ["distrito", "emitidoAt", "estado", "nombreComercial", "numero", "venceAt"].sort(),
      );
    }
  });
});
