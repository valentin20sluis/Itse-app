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

import { getResolucionPdfData } from "@/modules/certificados/services/resolucion-pdf.service";

const admin = { id: "u1", rol: "admin" as const };
const cliente = { id: "u3", rol: "cliente" as const };
const emitido = new Date("2026-11-01T12:00:00.000Z");

const fila = (extra: Record<string, unknown> = {}) => ({
  resolucionNumero: "RG-2026-0001",
  resolucionAt: emitido,
  certificadoNumero: "0001-2026",
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
  ...extra,
});

beforeEach(() => {
  h.lecturas = [];
  h.consultas = 0;
});

describe("getResolucionPdfData", () => {
  it.each([
    ["sin fila", undefined],
    ["sin número de resolución", fila({ resolucionNumero: null })],
    ["sin fecha de resolución", fila({ resolucionAt: null })],
    ["sin emisión", fila({ emitidoAt: null })],
    ["anulado", fila({ estado: "ANULADO" })],
    ["pendiente de firma", fila({ estado: "CERTIFICADO_PENDIENTE_FIRMA" })],
  ])("null: %s", async (_n, f) => {
    h.lecturas = [f ? [f] : []];
    expect(await getResolucionPdfData(admin, "e")).toBeNull();
  });

  it("cliente: solo propio y solo en ENTREGADO; no consulta el historial si no aplica", async () => {
    h.lecturas = [[fila({ estado: "FINALIZADO" })]];
    expect(await getResolucionPdfData(cliente, "e")).toBeNull();
    h.lecturas = [[fila({ usuarioId: "otro" })]];
    expect(await getResolucionPdfData(cliente, "e")).toBeNull();
    expect(h.consultas).toBe(2);
    h.lecturas = [[fila()], []];
    expect((await getResolucionPdfData(cliente, "e"))?.resolucionNumero).toBe("RG-2026-0001");
  });

  it("personal en FINALIZADO con el jefe tomado del historial; no expone datos sensibles", async () => {
    h.lecturas = [[fila({ estado: "FINALIZADO" })], [{ nombres: "Rosa", apellidos: "Díaz" }]];
    const r = await getResolucionPdfData(admin, "e");
    expect(r).toEqual({
      resolucionNumero: "RG-2026-0001",
      resolucionAt: emitido,
      certificadoNumero: "0001-2026",
      emitidoAt: emitido,
      venceAt: new Date("2028-11-01T05:00:00.000Z"),
      expedienteNumero: "EXP-2026-00001",
      solicitante: { nombre: "Ana Quispe", razonSocial: null },
      establecimiento: {
        nombreComercial: "Bodega Sol",
        direccion: "Av. Ficticia 123",
        distrito: "Distrito Uno",
        giro: "Bodega",
      },
      nivelRiesgo: "MEDIO",
      jefeNombre: "Rosa Díaz",
    });
    for (const k of ["codigo", "documento", "telefono", "email"]) expect(JSON.stringify(r)).not.toContain(k);
  });

  it("jefeNombre es null sin fila de historial", async () => {
    h.lecturas = [[fila()], []];
    expect((await getResolucionPdfData(admin, "e"))?.jefeNombre).toBeNull();
  });
});
