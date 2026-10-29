import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  filas: [] as unknown[],
  wheres: [] as unknown[],
  selects: 0,
}));

vi.mock("@/db", () => ({
  db: {
    select: () => {
      h.selects++;
      const c: Record<string, unknown> = {};
      c.from = () => c;
      c.innerJoin = () => c;
      c.where = (w: unknown) => {
        h.wheres.push(w);
        return c;
      };
      c.then = (res: (v: unknown) => unknown) => res(h.filas);
      return c;
    },
  },
}));

const listOwnEstablecimientos = vi.hoisted(() => vi.fn());
const listOwnExpedientes = vi.hoisted(() => vi.fn());
const listCertificadosCliente = vi.hoisted(() => vi.fn());
const getFeriados = vi.hoisted(() => vi.fn());

vi.mock("@/modules/establecimientos/services/establecimiento.service", () => ({ listOwnEstablecimientos }));
vi.mock("@/modules/expedientes/services/expediente.service", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listOwnExpedientes,
}));
vi.mock("@/modules/certificados/services/certificado-lista.service", () => ({ listCertificadosCliente }));
vi.mock("@/modules/configuracion/services/feriado-lectura.service", () => ({ getFeriados }));

import { getInicioCliente } from "@/modules/client-area/services/inicio.service";

const dialect = new PgDialect();
const AHORA = new Date("2026-10-14T15:00:00.000Z");
const cliente = { id: "u1", rol: "cliente" as const };

const exp = (id: string, estado: string, extra: object = {}) => ({
  id,
  estado,
  numero: `EXP-${id}`,
  establecimientoId: `est-${id}`,
  establecimientoNombre: `Local ${id}`,
  pagoPendiente: false,
  nivelRiesgo: null,
  diligenciaProgramadaPara: null,
  subsanacionLimite: null,
  subsanacionPresentadaAt: null,
  resolucionNoCumpleNumero: null,
  ...extra,
});
const est = (id: string) => ({ id: `est-${id}`, nombreComercial: `Local ${id}`, direccion: `Calle ${id} 100` });
const obs = (expedienteId: string, comentario: string, dia: number) => ({
  id: `h-${expedienteId}-${dia}`,
  expedienteId,
  estadoAnterior: "EN_REVISION",
  estadoNuevo: "OBSERVADO_REQUISITOS",
  comentario,
  createdAt: new Date(Date.UTC(2026, 9, dia)),
});

beforeEach(() => {
  h.filas = [];
  h.wheres = [];
  h.selects = 0;
  for (const m of [listOwnEstablecimientos, listOwnExpedientes, listCertificadosCliente, getFeriados]) m.mockReset();
  listOwnEstablecimientos.mockResolvedValue([]);
  listOwnExpedientes.mockResolvedValue([]);
  listCertificadosCliente.mockResolvedValue([]);
  getFeriados.mockResolvedValue([]);
});

describe("getInicioCliente", () => {
  it.each(["admin", "superadmin"] as const)("rechaza a %s sin consultar nada", async (rol) => {
    await expect(getInicioCliente({ id: "x", rol }, AHORA)).rejects.toThrow("No autorizado");
    expect(listOwnEstablecimientos).not.toHaveBeenCalled();
    expect(listOwnExpedientes).not.toHaveBeenCalled();
    expect(listCertificadosCliente).not.toHaveBeenCalled();
    expect(h.selects).toBe(0);
  });

  it("lee cada servicio con el actor recibido", async () => {
    await getInicioCliente(cliente, AHORA);
    expect(listOwnEstablecimientos).toHaveBeenCalledWith(cliente);
    expect(listOwnExpedientes).toHaveBeenCalledWith(cliente);
    expect(listCertificadosCliente).toHaveBeenCalledWith(cliente, AHORA);
  });

  it("dos clientes producen lecturas con su propio actor", async () => {
    const otro = { id: "u2", rol: "cliente" as const };
    await getInicioCliente(cliente, AHORA);
    await getInicioCliente(otro, AHORA);
    expect(listOwnExpedientes.mock.calls.map((c) => c[0])).toEqual([cliente, otro]);
  });

  it("sin observados ni en subsanación no consulta historial ni feriados", async () => {
    listOwnExpedientes.mockResolvedValue([exp("1", "PRESENTADO")]);
    await getInicioCliente(cliente, AHORA);
    expect(h.selects).toBe(0);
    expect(getFeriados).not.toHaveBeenCalled();
  });

  it("con 3 observados hace una sola consulta, del cliente y solo de sus ids, y el motivo llega a su paso", async () => {
    listOwnExpedientes.mockResolvedValue([
      exp("1", "OBSERVADO_REQUISITOS"),
      exp("2", "OBSERVADO_REQUISITOS"),
      exp("3", "OBSERVADO_REQUISITOS"),
    ]);
    h.filas = [obs("1", "Falta plano", 1), obs("1", "Falta plano actualizado", 5), obs("2", "Foto borrosa", 2)];

    const r = await getInicioCliente(cliente, AHORA);

    expect(h.selects).toBe(1);
    const q = dialect.sqlToQuery(h.wheres[0] as SQL);
    expect(q.params).toEqual(expect.arrayContaining(["u1", "1", "2", "3"]));
    expect(q.params).not.toContain("ajeno");
    expect(q.sql).toContain('"expedientes"."usuario_id"');
    const motivo = (id: string) => r.pasos.find((p) => p.expedienteId === id)?.motivo;
    expect(motivo("1")).toBe("Falta plano actualizado");
    expect(motivo("2")).toBe("Foto borrosa");
    expect(motivo("3")).toBeUndefined();
  });

  it("con EN_SUBSANACION lee los feriados una vez", async () => {
    listOwnExpedientes.mockResolvedValue([
      exp("1", "EN_SUBSANACION", { nivelRiesgo: "BAJO", subsanacionLimite: new Date("2026-10-19T17:00:00.000Z") }),
      exp("2", "EN_SUBSANACION", { nivelRiesgo: "BAJO", subsanacionLimite: new Date("2026-10-19T17:00:00.000Z") }),
    ]);
    getFeriados.mockResolvedValue(["2026-10-16"]);
    const r = await getInicioCliente(cliente, AHORA);
    expect(getFeriados).toHaveBeenCalledTimes(1);
    expect(r.pasos[0].mensaje).toContain("Quedan 2 días hábiles");
  });

  it("usa la dirección del establecimiento en la inspección programada", async () => {
    listOwnEstablecimientos.mockResolvedValue([est("1")]);
    listOwnExpedientes.mockResolvedValue([
      exp("1", "DILIGENCIA_PROGRAMADA", { diligenciaProgramadaPara: new Date("2026-10-20T17:00:00.000Z") }),
    ]);
    const r = await getInicioCliente(cliente, AHORA);
    expect(r.pasos[0].mensaje).toContain("en Calle 1 100");
  });

  it("el resultado no trae datos de inspectores ni teléfonos", async () => {
    listOwnExpedientes.mockResolvedValue([
      exp("1", "INSPECTOR_DESIGNADO", { solicitanteTelefono: "999888777" }),
    ]);
    const json = JSON.stringify(await getInicioCliente(cliente, AHORA));
    expect(json).not.toMatch(/inspector(Id|es)|telefono|solicitanteTelefono|999888777|fileKey/i);
  });

  it("mezcla de estados: pasos ordenados por urgencia y puedeSolicitar según libres", async () => {
    listOwnEstablecimientos.mockResolvedValue([est("1"), est("2"), est("3")]);
    listOwnExpedientes.mockResolvedValue([
      exp("1", "ENTREGADO"),
      exp("2", "EN_REVISION"),
      exp("3", "BORRADOR", { numero: null, pagoPendiente: true }),
      exp("4", "ANULADO", { establecimientoId: "est-3" }),
    ]);
    const r = await getInicioCliente(cliente, AHORA);
    expect(r.pasos.map((p) => p.expedienteId)).toEqual(["3", "2", "1"]);
    expect(r.puedeSolicitar).toBe(false);
    expect(r.expedientes).toMatchObject({ enCurso: 2, finalizados: 1 });

    listOwnExpedientes.mockResolvedValue([exp("1", "ENTREGADO")]);
    expect((await getInicioCliente(cliente, AHORA)).puedeSolicitar).toBe(true);
  });
});
