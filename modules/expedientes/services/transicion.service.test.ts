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

import { actualizarRiesgo, aplicar, cambiarEstado } from "@/modules/expedientes/services/transicion.service";

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

  describe("Jefatura", () => {
    it("EN_REVISION -> ENVIADO_JEFATURA: ok para admin y superadmin", async () => {
      h.fila = { estado: "EN_REVISION", nivelRiesgo: "MEDIO", numero: "n" };
      expect(await cambiarEstado(admin, "e", { hasta: "ENVIADO_JEFATURA" })).toEqual({ status: "ok" });
      expect(await cambiarEstado(superadmin, "e", { hasta: "ENVIADO_JEFATURA" })).toEqual({ status: "ok" });
    });

    it("admin no aprueba ni devuelve: no_permitido sin batch", async () => {
      h.fila = { estado: "ENVIADO_JEFATURA", nivelRiesgo: "MEDIO", numero: "n" };
      expect(await cambiarEstado(admin, "e", { hasta: "APROBADO_JEFATURA" })).toEqual({ status: "no_permitido" });
      expect(await cambiarEstado(admin, "e", { hasta: "EN_REVISION" })).toEqual({ status: "no_permitido" });
      expect(await cambiarEstado(admin, "e", { hasta: "EN_REVISION", comentario: "x".repeat(10) })).toEqual({
        status: "no_permitido",
      });
      expect(h.batch).not.toHaveBeenCalled();
    });

    it("superadmin aprueba y devuelve en un batch con estados e historial", async () => {
      h.fila = { estado: "ENVIADO_JEFATURA", nivelRiesgo: "MEDIO", numero: "n" };
      expect(await cambiarEstado(superadmin, "e", { hasta: "APROBADO_JEFATURA" })).toEqual({ status: "ok" });
      expect(h.batch).toHaveBeenCalledTimes(1);
      expect(
        await cambiarEstado(superadmin, "e", { hasta: "EN_REVISION", comentario: "Falta el plano" + "!".repeat(3) }),
      ).toEqual({ status: "ok" });
      expect(h.batch).toHaveBeenCalledTimes(2);
      const { params } = new PgDialect().sqlToQuery(h.batch.mock.calls[1][0][1].q);
      expect(params).toEqual(
        expect.arrayContaining(["ENVIADO_JEFATURA", "EN_REVISION", "u2", "Falta el plano!!!"]),
      );
    });

    it("devolver sin motivo suficiente: motivo_requerido sin batch", async () => {
      h.fila = { estado: "ENVIADO_JEFATURA", nivelRiesgo: "MEDIO", numero: "n" };
      expect(await cambiarEstado(superadmin, "e", { hasta: "EN_REVISION" })).toEqual({ status: "motivo_requerido" });
      expect(await cambiarEstado(superadmin, "e", { hasta: "EN_REVISION", comentario: "corto" })).toEqual({
        status: "motivo_requerido",
      });
      expect(h.batch).not.toHaveBeenCalled();
    });

    it("PRESENTADO -> EN_REVISION sin comentario sigue ok", async () => {
      expect(await cambiarEstado(admin, "e", { hasta: "EN_REVISION" })).toEqual({ status: "ok" });
    });

    it("transiciones ilegales: no_permitido sin batch", async () => {
      const casos: [string, "ENVIADO_JEFATURA" | "APROBADO_JEFATURA" | "EN_REVISION" | "EN_TRAMITE_EXTERNO"][] = [
        ["PRESENTADO", "ENVIADO_JEFATURA"],
        ["EN_REVISION", "APROBADO_JEFATURA"],
        ["APROBADO_JEFATURA", "EN_REVISION"],
        ["EN_REVISION", "EN_TRAMITE_EXTERNO"],
      ];
      for (const [estado, hasta] of casos) {
        h.fila = { estado, nivelRiesgo: "MEDIO", numero: "n" };
        expect(await cambiarEstado(superadmin, "e", { hasta, comentario: "x".repeat(10) })).toEqual({
          status: "no_permitido",
        });
      }
      expect(h.batch).not.toHaveBeenCalled();
    });

    it("conflicto en la nueva transición", async () => {
      h.fila = { estado: "EN_REVISION", nivelRiesgo: "MEDIO", numero: "n" };
      h.actualizados = [];
      expect(await cambiarEstado(admin, "e", { hasta: "ENVIADO_JEFATURA" })).toEqual({ status: "conflicto" });
    });
  });

  it("FINALIZADO es flujo propio (no_permitido sin batch); FINALIZADO -> ENTREGADO es genérico", async () => {
    h.fila = { estado: "CERTIFICADO_PENDIENTE_FIRMA", nivelRiesgo: "MEDIO", numero: "n" };
    expect(await cambiarEstado(admin, "e", { hasta: "FINALIZADO" })).toEqual({ status: "no_permitido" });
    expect(await cambiarEstado(superadmin, "e", { hasta: "FINALIZADO" })).toEqual({ status: "no_permitido" });
    expect(h.batch).not.toHaveBeenCalled();
    h.fila = { estado: "FINALIZADO", nivelRiesgo: "MEDIO", numero: "n" };
    expect(await cambiarEstado(admin, "e", { hasta: "ENTREGADO" })).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(1);
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

describe("cambiarEstado - flujo propio y aplicar con extras", () => {
  it("INSPECTOR_DESIGNADO no se alcanza con cambiarEstado", async () => {
    h.fila = { estado: "APROBADO_JEFATURA", nivelRiesgo: "MEDIO", numero: "n" };
    expect(await cambiarEstado(superadmin, "e", { hasta: "INSPECTOR_DESIGNADO" })).toEqual({
      status: "no_permitido",
    });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("extras viajan en la misma llamada a db.batch", async () => {
    await aplicar(admin, "e", "PRESENTADO", "EN_REVISION", {}, undefined, null, () => [
      { kind: "extra" } as never,
    ]);
    expect(h.batch).toHaveBeenCalledTimes(1);
    expect(h.batch.mock.calls[0][0].map((s: { kind: string }) => s.kind)).toEqual([
      "update",
      "insert",
      "extra",
    ]);
  });
});
