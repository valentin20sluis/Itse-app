import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ lecturas: [] as unknown[], consultas: 0 }));

function cadena() {
  h.consultas++;
  const c: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "innerJoin", "orderBy"]) c[m] = () => c;
  c.then = (res: (v: unknown) => unknown) => res(h.lecturas.shift());
  return c;
}

vi.mock("@/db", () => ({ db: { select: () => cadena() } }));

import { getCertificadoPdfData } from "@/modules/certificados/services/certificado-pdf.service";

const admin = { id: "u1", rol: "admin" as const };
const cliente = { id: "u3", rol: "cliente" as const };
const emitido = new Date("2026-11-01T12:00:00.000Z");

const fila = (extra: Record<string, unknown> = {}) => ({
  numero: "0001-2026",
  codigo: "ABCDEFGHJKMN",
  emitidoAt: emitido,
  venceAt: new Date("2028-11-01T05:00:00.000Z"),
  expedienteNumero: "EXP-2026-00001",
  estado: "ENTREGADO",
  usuarioId: "u3",
  nivelRiesgo: "MEDIO",
  solicitanteNombre: "Ana Quispe",
  razonSocial: null,
  nombreComercial: "Bodega Sol",
  direccion: "Av. Ficticia 123",
  distrito: "Distrito Uno",
  giro: "Bodega",
  areaM2: "120.00",
  ...extra,
});

beforeEach(() => {
  h.lecturas = [];
  h.consultas = 0;
});

describe("getCertificadoPdfData", () => {
  it.each([
    ["sin fila", undefined],
    ["sin emisión", fila({ emitidoAt: null })],
    ["anulado", fila({ estado: "ANULADO" })],
    ["pendiente de firma", fila({ estado: "CERTIFICADO_PENDIENTE_FIRMA" })],
  ])("null: %s", async (_n, f) => {
    h.lecturas = [f ? [f] : []];
    expect(await getCertificadoPdfData(admin, "e")).toBeNull();
  });

  it("pendiente de firma es null también para el superadmin", async () => {
    h.lecturas = [[fila({ estado: "CERTIFICADO_PENDIENTE_FIRMA" })]];
    expect(await getCertificadoPdfData({ id: "s", rol: "superadmin" }, "e")).toBeNull();
  });

  it("cliente: solo propio y solo en ENTREGADO", async () => {
    h.lecturas = [[fila({ estado: "FINALIZADO" })]];
    expect(await getCertificadoPdfData(cliente, "e")).toBeNull();
    h.lecturas = [[fila({ usuarioId: "otro" })]];
    expect(await getCertificadoPdfData(cliente, "e")).toBeNull();
    expect(h.consultas).toBe(2);
    h.lecturas = [[fila()], []];
    expect((await getCertificadoPdfData(cliente, "e"))?.numero).toBe("0001-2026");
  });

  it("personal en FINALIZADO con el jefe del historial; sin datos sensibles", async () => {
    h.lecturas = [[fila({ estado: "FINALIZADO" })], [{ nombres: "Rosa", apellidos: "Díaz" }]];
    const r = await getCertificadoPdfData(admin, "e");
    expect(r).toEqual({
      numero: "0001-2026",
      codigo: "ABCDEFGHJKMN",
      emitidoAt: emitido,
      venceAt: new Date("2028-11-01T05:00:00.000Z"),
      expedienteNumero: "EXP-2026-00001",
      solicitante: { nombre: "Ana Quispe", razonSocial: null },
      establecimiento: {
        nombreComercial: "Bodega Sol",
        direccion: "Av. Ficticia 123",
        distrito: "Distrito Uno",
        giro: "Bodega",
        areaM2: "120.00",
      },
      nivelRiesgo: "MEDIO",
      tipoItse: "POSTERIOR",
      jefeNombre: "Rosa Díaz",
    });
    for (const k of ["documento", "telefono", "email"]) expect(JSON.stringify(r)).not.toContain(k);
  });

  it("riesgo alto es ITSE previa y jefeNombre es null sin historial", async () => {
    h.lecturas = [[fila({ nivelRiesgo: "ALTO" })], []];
    const r = await getCertificadoPdfData(admin, "e");
    expect(r?.tipoItse).toBe("PREVIA");
    expect(r?.jefeNombre).toBeNull();
  });
});
