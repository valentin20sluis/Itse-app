import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  exp: undefined as Record<string, unknown> | undefined,
  docs: [] as { tipo: string }[],
  actualizados: [{ id: "x" }] as unknown[],
  batch: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => ({ where: () => ({ limit: async () => (h.exp ? [h.exp] : []) }) }),
        where: async () => h.docs,
      }),
    }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => ({ kind: "update" }) }) }) }),
    insert: () => ({ select: (q: unknown) => ({ kind: "insert", q }) }),
    batch: h.batch,
  },
}));

import { reenviarRequisitos } from "@/modules/expedientes/services/requisitos.service";

const cliente = { id: "u3", rol: "cliente" as const };
const BASICOS = ["DNI_AMBAS_CARAS", "FICHA_RUC", "EXTINTORES_PQS", "CAPACITACION_EXTINTORES"];

beforeEach(() => {
  h.exp = {
    estado: "OBSERVADO_REQUISITOS",
    nivelRiesgo: "BAJO",
    calidadSolicitante: "PROPIETARIO",
    tieneCocina: false,
    esGrifo: false,
    almacenaInflamables: false,
    numeroPisos: 1,
  };
  h.docs = BASICOS.map((tipo) => ({ tipo }));
  h.actualizados = [{ id: "x" }];
  h.batch.mockReset();
  h.batch.mockImplementation(async () => [h.actualizados, []]);
});

describe("reenviarRequisitos", () => {
  it("lanza para admin y superadmin", async () => {
    for (const rol of ["admin", "superadmin"] as const) {
      await expect(reenviarRequisitos({ id: "s", rol }, "e")).rejects.toThrow("No autorizado");
    }
  });

  it("no_encontrado si no existe o es ajeno", async () => {
    h.exp = undefined;
    expect(await reenviarRequisitos(cliente, "e")).toEqual({ status: "no_encontrado" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("no_permitido fuera de OBSERVADO_REQUISITOS", async () => {
    h.exp = { ...h.exp, estado: "EN_REVISION" };
    expect(await reenviarRequisitos(cliente, "e")).toEqual({ status: "no_permitido" });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("incompleto: lista los obligatorios que faltan", async () => {
    h.docs = [{ tipo: "FICHA_RUC" }];
    expect(await reenviarRequisitos(cliente, "e")).toEqual({
      status: "incompleto",
      faltantes: ["DNI_AMBAS_CARAS", "EXTINTORES_PQS", "CAPACITACION_EXTINTORES"],
    });
    expect(h.batch).not.toHaveBeenCalled();
  });

  it("exige la acreditación si el solicitante no es propietario", async () => {
    h.exp = { ...h.exp, calidadSolicitante: "REPRESENTANTE_LEGAL" };
    expect(await reenviarRequisitos(cliente, "e")).toEqual({
      status: "incompleto",
      faltantes: ["ACREDITACION_REPRESENTACION"],
    });
    h.docs = [...h.docs, { tipo: "ACREDITACION_REPRESENTACION" }];
    expect(await reenviarRequisitos(cliente, "e")).toEqual({ status: "ok" });
  });

  it("ok: un db.batch con UPDATE e INSERT de historial con el comentario", async () => {
    expect(await reenviarRequisitos(cliente, "e")).toEqual({ status: "ok" });
    expect(h.batch).toHaveBeenCalledTimes(1);
    const [sentencias] = h.batch.mock.calls[0];
    expect(sentencias.map((s: { kind: string }) => s.kind)).toEqual(["update", "insert"]);
    const { params } = new PgDialect().sqlToQuery(sentencias[1].q);
    expect(params).toEqual(
      expect.arrayContaining([
        "OBSERVADO_REQUISITOS",
        "PRESENTADO",
        "u3",
        "Requisitos subsanados y reenviados.",
      ]),
    );
  });

  it("conflicto si el UPDATE no afecta filas", async () => {
    h.actualizados = [];
    expect(await reenviarRequisitos(cliente, "e")).toEqual({ status: "conflicto" });
  });
});
