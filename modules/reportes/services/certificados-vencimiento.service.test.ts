import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  filas: [] as unknown[],
  where: undefined as unknown,
  campos: undefined as unknown,
}));

function cadena() {
  const c: Record<string, unknown> = {};
  for (const m of ["from", "innerJoin"]) c[m] = () => c;
  c.where = (w: unknown) => {
    h.where = w;
    return c;
  };
  c.then = (res: (v: unknown) => unknown) => res(h.filas);
  return c;
}

vi.mock("@/db", () => ({
  db: {
    select: (campos: unknown) => {
      h.campos = campos;
      return cadena();
    },
  },
}));

import type { SQL } from "drizzle-orm";
import { contarCertificadosPorVencimiento } from "@/modules/reportes/services/certificados-vencimiento.service";
import { estadoCertificado } from "@/modules/certificados/utils/vigencia";
import { aInputLima, parseFechaLima } from "@/modules/inspecciones/utils/fecha-diligencia";

const dialect = new PgDialect();
const consulta = (s: unknown) => dialect.sqlToQuery(s as SQL);

const admin = { id: "u1", rol: "admin" as const };
const AHORA = new Date("2027-01-10T15:00:00.000Z");
const HOY = parseFechaLima(aInputLima(AHORA)) as Date;
const enDias = (n: number) => new Date(HOY.getTime() + n * 86_400_000);

beforeEach(() => {
  h.filas = [];
  h.where = undefined;
});

describe("contarCertificadosPorVencimiento", () => {
  it("rechaza al cliente", async () => {
    await expect(contarCertificadosPorVencimiento({ id: "u3", rol: "cliente" }, {}, AHORA)).rejects.toThrow(
      "No autorizado",
    );
  });

  it("devuelve solo los cuatro contadores numericos", async () => {
    h.filas = [{ vencidos: 1, hasta30: 2, de31a60: 3, vigentes: 4, nombre: "SECRETO" }];
    const r = await contarCertificadosPorVencimiento(admin, {}, AHORA);
    expect(r).toEqual({ vencidos: 1, hasta30: 2, de31a60: 3, vigentes: 4 });
  });

  it("sin filas devuelve ceros", async () => {
    expect(await contarCertificadosPorVencimiento(admin, {}, AHORA)).toEqual({
      vencidos: 0,
      hasta30: 0,
      de31a60: 0,
      vigentes: 0,
    });
  });

  it("excluye ANULADO y usa los limites de hoy en Lima", async () => {
    await contarCertificadosPorVencimiento(admin, {}, AHORA);
    const { sql: texto, params } = consulta(h.where);
    expect(texto).toContain('"expedientes"."estado" in');
    expect(params).toEqual(expect.arrayContaining(["FINALIZADO", "ENTREGADO"]));
    expect(params).not.toContain("ANULADO");

    const campos = h.campos as Record<string, unknown>;
    const todos = Object.values(campos).map((c) => consulta(c).params.map((p) => (p instanceof Date ? p.toISOString() : String(p))));
    expect(todos.flat()).toEqual(
      expect.arrayContaining([
        HOY.toISOString(),
        enDias(30).toISOString(),
        enDias(60).toISOString(),
      ]),
    );
  });

  it("pasa los filtros opcionales a la consulta", async () => {
    await contarCertificadosPorVencimiento(admin, { riesgo: "ALTO", distrito: "Distrito Uno" }, AHORA);
    const { sql: texto, params } = consulta(h.where);
    expect(texto).toContain('"nivel_riesgo"');
    expect(texto).toContain('"distrito"');
    expect(params).toEqual(expect.arrayContaining(["ALTO", "Distrito Uno"]));
  });

  it("sin filtros no filtra por riesgo ni distrito", async () => {
    await contarCertificadosPorVencimiento(admin, {}, AHORA);
    const { sql: texto } = consulta(h.where);
    expect(texto).not.toContain('"nivel_riesgo"');
    expect(texto).not.toContain('"distrito"');
  });

  it("hasta30 + de31a60 coincide con POR_VENCER de estadoCertificado en las fronteras", () => {
    const H30 = enDias(30).getTime();
    const H60 = enDias(60).getTime();
    for (const dias of [61, 60, 31, 30, 0, -1]) {
      const venceAt = enDias(dias);
      const t = venceAt.getTime();
      const enTramos = t >= HOY.getTime() && t <= H60;
      const enHasta30 = t >= HOY.getTime() && t <= H30;
      const enDe31 = t > H30 && t <= H60;
      expect(enHasta30 || enDe31).toBe(enTramos);
      expect(enTramos).toBe(estadoCertificado({ venceAt, revocado: false }, AHORA) === "POR_VENCER");
    }
  });
});
