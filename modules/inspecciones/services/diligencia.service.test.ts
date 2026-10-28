import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const h = vi.hoisted(() => ({
  lecturas: [] as unknown[],
  actualizados: [{ id: "x" }] as unknown[],
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
    update: () => ({ set: () => ({ where: () => ({ returning: () => ({ kind: "update" }) }) }) }),
    insert: () => ({ select: (q: unknown) => ({ kind: "insert", q }) }),
    batch: h.batch,
  },
}));

import { cambiarEstado } from "@/modules/expedientes/services/transicion.service";
import {
  programarDiligencia,
  registrarResultadoDiligencia,
} from "@/modules/inspecciones/services/diligencia.service";

const admin = { id: "u1", rol: "admin" as const };
const superadmin = { id: "u2", rol: "superadmin" as const };
const cliente = { id: "u3", rol: "cliente" as const };

const exp = (estado: string, numero: string | null = "EXP-1") => [{ estado, numero }];
const ahora = new Date("2026-11-01T12:00:00.000Z");
const futura = new Date("2026-11-03T05:00:00.000Z");
const informe = "Cumple con todo lo exigido.";

beforeEach(() => {
  h.lecturas = [];
  h.actualizados = [{ id: "x" }];
  h.batch.mockReset();
  h.batch.mockImplementation(async () => [h.actualizados]);
});

describe("programarDiligencia", () => {
  it("lanza para cliente", async () => {
    await expect(programarDiligencia(cliente, "e", futura, ahora)).rejects.toThrow("No autorizado");
  });

  it("no_encontrado: inexistente o sin número", async () => {
    h.lecturas = [[]];
    expect(await programarDiligencia(admin, "e", futura, ahora)).toEqual({ status: "no_encontrado" });
    h.lecturas = [exp("INSPECTOR_DESIGNADO", null)];
    expect(await programarDiligencia(admin, "e", futura, ahora)).toEqual({ status: "no_encontrado" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("no_permitido: estado distinto, aunque la fecha sea inválida", async () => {
    h.lecturas = [exp("APROBADO_JEFATURA")];
    expect(await programarDiligencia(admin, "e", new Date(0), ahora)).toEqual({ status: "no_permitido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("fecha_invalida: pasada o a más de 90 días", async () => {
    h.lecturas = [exp("INSPECTOR_DESIGNADO")];
    const ayer = new Date("2026-10-31T05:00:00.000Z");
    expect(await programarDiligencia(admin, "e", ayer, ahora)).toEqual({ status: "fecha_invalida" });
    h.lecturas = [exp("INSPECTOR_DESIGNADO")];
    const lejos = new Date(new Date("2026-11-01T05:00:00.000Z").getTime() + 91 * 86_400_000);
    expect(await programarDiligencia(admin, "e", lejos, ahora)).toEqual({ status: "fecha_invalida" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("ok: un solo batch y comentario solo con fecha de Lima", async () => {
    h.lecturas = [exp("INSPECTOR_DESIGNADO")];
    expect(await programarDiligencia(admin, "e", futura, ahora)).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(1);
    const [sentencias] = h.batch.mock.calls[0];
    expect(sentencias.map((s: { kind: string }) => s.kind)).toEqual(["update", "insert"]);
    const historial = new PgDialect().sqlToQuery(sentencias[1].q);
    expect(historial.params).toEqual(
      expect.arrayContaining([
        "INSPECTOR_DESIGNADO",
        "DILIGENCIA_PROGRAMADA",
        "u1",
        "Diligencia programada para el 03/11/2026.",
      ]),
    );
  });

  it("conflicto: el UPDATE afecta 0 filas", async () => {
    h.lecturas = [exp("INSPECTOR_DESIGNADO")];
    h.actualizados = [];
    expect(await programarDiligencia(superadmin, "e", futura, ahora)).toEqual({ status: "conflicto" });
    expect(h.batch).toHaveBeenCalledTimes(1);
  });
});

describe("registrarResultadoDiligencia", () => {
  it("lanza para cliente", async () => {
    await expect(
      registrarResultadoDiligencia(cliente, "e", { resultado: "CUMPLE", informe }),
    ).rejects.toThrow("No autorizado");
  });

  it("no_encontrado", async () => {
    h.lecturas = [[]];
    expect(await registrarResultadoDiligencia(admin, "e", { resultado: "CUMPLE", informe })).toEqual({
      status: "no_encontrado",
    });
  });

  it.each(["INSPECTOR_DESIGNADO", "APROBADO_JEFATURA", "CUMPLE"])(
    "no_permitido desde %s, sin batch",
    async (estado) => {
      h.lecturas = [exp(estado)];
      expect(await registrarResultadoDiligencia(admin, "e", { resultado: "CUMPLE", informe })).toEqual({
        status: "no_permitido",
      });
      expect(h.batch).not.toHaveBeenCalled();
    },
  );

  it("no_permitido: resultado fuera de CUMPLE/NO_CUMPLE", async () => {
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA")];
    const r = await registrarResultadoDiligencia(superadmin, "e", {
      resultado: "ANULADO" as never,
      informe,
    });
    expect(r).toEqual({ status: "no_permitido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("motivo_requerido: informe corto tras recortar", async () => {
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA")];
    const r = await registrarResultadoDiligencia(admin, "e", { resultado: "CUMPLE", informe: "  corto   " });
    expect(r).toEqual({ status: "motivo_requerido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("ok: un solo batch con el informe recortado como comentario", async () => {
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA")];
    const r = await registrarResultadoDiligencia(admin, "e", { resultado: "NO_CUMPLE", informe: `  ${informe}  ` });
    expect(r).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(1);
    const [sentencias] = h.batch.mock.calls[0];
    const historial = new PgDialect().sqlToQuery(sentencias[1].q);
    expect(historial.params).toEqual(
      expect.arrayContaining(["DILIGENCIA_PROGRAMADA", "NO_CUMPLE", "u1", informe]),
    );
  });

  it("conflicto: el UPDATE afecta 0 filas", async () => {
    h.lecturas = [exp("DILIGENCIA_PROGRAMADA")];
    h.actualizados = [];
    expect(await registrarResultadoDiligencia(admin, "e", { resultado: "CUMPLE", informe })).toEqual({
      status: "conflicto",
    });
  });
});

describe("sin atajo por cambiarEstado", () => {
  it.each(["DILIGENCIA_PROGRAMADA", "CUMPLE", "NO_CUMPLE"] as const)("rechaza %s", async (hasta) => {
    h.lecturas = [[{ estado: "DILIGENCIA_PROGRAMADA", nivelRiesgo: "BAJO", numero: "n" }]];
    expect(await cambiarEstado(superadmin, "e", { hasta, comentario: informe })).toEqual({
      status: "no_permitido",
    });
    expect(h.batch).not.toHaveBeenCalled();
  });
});
