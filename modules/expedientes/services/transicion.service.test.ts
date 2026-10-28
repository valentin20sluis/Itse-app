import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const h = vi.hoisted(() => ({
  fila: undefined as Record<string, unknown> | undefined,
  actualizados: [{ id: "x" }] as unknown[],
  batch: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => (h.fila ? [h.fila] : []) }) }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => ({ kind: "update" }) }) }) }),
    insert: () => ({ select: (q: unknown) => ({ kind: "insert", q }) }),
    batch: h.batch,
  },
}));

import { actualizarRiesgo, cambiarEstado } from "@/modules/expedientes/services/transicion.service";

const admin = { id: "u1", rol: "admin" as const };
const superadmin = { id: "u2", rol: "superadmin" as const };
const cliente = { id: "u3", rol: "cliente" as const };

beforeEach(() => {
  h.fila = { estado: "PRESENTADO", nivelRiesgo: "MEDIO", numero: "EXP-2026-00001" };
  h.actualizados = [{ id: "x" }];
  h.batch.mockReset();
  h.batch.mockImplementation(async () => [h.actualizados, []]);
});

describe("cambiarEstado", () => {
  it("lanza para cliente", async () => {
    await expect(cambiarEstado(cliente, "e", { hasta: "EN_REVISION" })).rejects.toThrow("No autorizado");
  });

  it("transición permitida: un db.batch con UPDATE e INSERT", async () => {
    const r = await cambiarEstado(admin, "e", { hasta: "EN_REVISION" });
    expect(r).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(1);
    const [sentencias] = h.batch.mock.calls[0];
    expect(sentencias.map((s: { kind: string }) => s.kind)).toEqual(["update", "insert"]);
  });

  it("el INSERT del historial depende del UPDATE (estado de partida y nuevo)", async () => {
    await cambiarEstado(admin, "e", { hasta: "EN_REVISION", comentario: " listo " });
    const insert = h.batch.mock.calls[0][0][1];
    const { params } = new PgDialect().sqlToQuery(insert.q);
    expect(params).toEqual(expect.arrayContaining(["PRESENTADO", "EN_REVISION", "u1", "listo"]));
  });

  it("transición ilegal: no_permitido sin batch", async () => {
    const r = await cambiarEstado(admin, "e", { hasta: "OBSERVADO_REQUISITOS" });
    expect(r).toEqual({ status: "no_permitido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("ANULADO: admin no_permitido, superadmin ok", async () => {
    expect(await cambiarEstado(admin, "e", { hasta: "ANULADO", comentario: "x".repeat(10) })).toEqual({
      status: "no_permitido",
    });
    expect(await cambiarEstado(superadmin, "e", { hasta: "ANULADO", comentario: "x".repeat(10) })).toEqual({
      status: "ok",
    });
  });

  it("UPDATE con 0 filas: conflicto", async () => {
    h.actualizados = [];
    expect(await cambiarEstado(admin, "e", { hasta: "EN_REVISION" })).toEqual({ status: "conflicto" });
  });

  it("inexistente o sin número: no_encontrado", async () => {
    h.fila = undefined;
    expect(await cambiarEstado(admin, "e", { hasta: "EN_REVISION" })).toEqual({ status: "no_encontrado" });
    h.fila = { estado: "BORRADOR", nivelRiesgo: null, numero: null };
    expect(await cambiarEstado(admin, "e", { hasta: "ANULADO" })).toEqual({ status: "no_encontrado" });
    expect(h.batch).not.toHaveBeenCalled();
  });
});

describe("actualizarRiesgo", () => {
  beforeEach(() => {
    h.fila = { estado: "EN_REVISION", nivelRiesgo: "MEDIO", numero: "EXP-2026-00001" };
  });

  it("lanza para cliente", async () => {
    await expect(actualizarRiesgo(cliente, "e", { nivelRiesgo: "ALTO", nota: "x".repeat(10) })).rejects.toThrow(
      "No autorizado",
    );
  });

  it("fuera de EN_REVISION o mismo nivel: no_permitido", async () => {
    h.fila = { estado: "PRESENTADO", nivelRiesgo: "MEDIO", numero: "n" };
    expect(await actualizarRiesgo(admin, "e", { nivelRiesgo: "ALTO", nota: "x".repeat(10) })).toEqual({
      status: "no_permitido",
    });
    h.fila = { estado: "EN_REVISION", nivelRiesgo: "ALTO", numero: "n" };
    expect(await actualizarRiesgo(admin, "e", { nivelRiesgo: "ALTO", nota: "x".repeat(10) })).toEqual({
      status: "no_permitido",
    });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("ok: comentario con formato exacto en el mismo batch", async () => {
    const r = await actualizarRiesgo(admin, "e", { nivelRiesgo: "ALTO", nota: " Tiene sótano " });
    expect(r).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(1);
    const { params } = new PgDialect().sqlToQuery(h.batch.mock.calls[0][0][1].q);
    expect(params).toContain("Nivel de riesgo: Medio → Alto. Tiene sótano");
    expect(params.filter((p) => p === "EN_REVISION").length).toBeGreaterThanOrEqual(2);
  });

  it("conflicto y no_encontrado", async () => {
    h.actualizados = [];
    expect(await actualizarRiesgo(admin, "e", { nivelRiesgo: "ALTO", nota: "x".repeat(10) })).toEqual({
      status: "conflicto",
    });
    h.fila = undefined;
    expect(await actualizarRiesgo(admin, "e", { nivelRiesgo: "ALTO", nota: "x".repeat(10) })).toEqual({
      status: "no_encontrado",
    });
  });
});
