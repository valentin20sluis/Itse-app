import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ filas: [] as unknown[], limite: 0 }));

function cadena() {
  const c: Record<string, unknown> = {};
  for (const m of ["from", "where", "innerJoin", "orderBy"]) c[m] = () => c;
  c.limit = (n: number) => {
    h.limite = n;
    return c;
  };
  c.then = (res: (v: unknown) => unknown) => res(h.filas);
  return c;
}

vi.mock("@/db", () => ({ db: { select: () => cadena() } }));

import {
  limitesFiltro,
  listCertificadosCliente,
  listCertificadosPanel,
  listResolucionesNoCumpleCliente,
} from "@/modules/certificados/services/certificado-lista.service";
import { estadoCertificado } from "@/modules/certificados/utils/vigencia";
import { aInputLima, parseFechaLima } from "@/modules/inspecciones/utils/fecha-diligencia";

const admin = { id: "u1", rol: "admin" as const };
const cliente = { id: "u3", rol: "cliente" as const };
const AHORA = new Date("2027-01-10T15:00:00.000Z");
const HOY = parseFechaLima(aInputLima(AHORA)) as Date;
const enDias = (n: number) => new Date(HOY.getTime() + n * 86_400_000);

const fila = (extra: Record<string, unknown> = {}) => ({
  expedienteId: "e1",
  expedienteNumero: "EXP-2026-00001",
  numero: "0001-2026",
  nombreComercial: "Bodega Sol",
  distrito: "Distrito Uno",
  emitidoAt: new Date("2026-11-01T15:00:00.000Z"),
  venceAt: enDias(100),
  estado: "ENTREGADO",
  codigo: "SECRETO",
  documento: "123",
  ...extra,
});

beforeEach(() => {
  h.filas = [];
  h.limite = 0;
});

describe("limitesFiltro", () => {
  it("todos no limita", () => {
    expect(limitesFiltro("todos", AHORA)).toEqual({});
  });

  it("por-vencer coincide con estadoCertificado en las fronteras", () => {
    const { desde, hasta } = limitesFiltro("por-vencer", AHORA);
    for (const dias of [-1, 0, 60, 61]) {
      const venceAt = enDias(dias);
      const dentro = venceAt >= desde! && venceAt <= hasta!;
      expect(dentro).toBe(estadoCertificado({ venceAt, revocado: false }, AHORA) === "POR_VENCER");
    }
  });

  it("vencidos coincide con estadoCertificado en las fronteras", () => {
    const { antesDe } = limitesFiltro("vencidos", AHORA);
    for (const dias of [-1, 0, 60, 61]) {
      const venceAt = enDias(dias);
      expect(venceAt < antesDe!).toBe(estadoCertificado({ venceAt, revocado: false }, AHORA) === "VENCIDO");
    }
  });
});

describe("listCertificadosPanel", () => {
  it("lanza No autorizado para cliente", async () => {
    await expect(listCertificadosPanel(cliente, "todos", AHORA)).rejects.toThrow("No autorizado");
  });

  it("mapea filas con días restantes y estado, y no expone código ni datos personales", async () => {
    h.filas = [fila({ venceAt: enDias(30) }), fila({ estado: "ANULADO" }), fila({ venceAt: enDias(-1) })];
    const r = await listCertificadosPanel(admin, "todos", AHORA);
    expect(r.map((x) => [x.diasRestantes, x.estado])).toEqual([
      [30, "POR_VENCER"],
      [100, "REVOCADO"],
      [-1, "VENCIDO"],
    ]);
    expect(Object.keys(r[0]).sort()).toEqual(
      [
        "diasRestantes",
        "distrito",
        "emitidoAt",
        "estado",
        "expedienteId",
        "expedienteNumero",
        "nombreComercial",
        "numero",
        "venceAt",
      ].sort(),
    );
    expect(JSON.stringify(r)).not.toContain("SECRETO");
  });

  it("descarta filas sin emisión y limita a 100", async () => {
    h.filas = [fila({ emitidoAt: null })];
    expect(await listCertificadosPanel(admin, "por-vencer", AHORA)).toEqual([]);
    expect(h.limite).toBe(100);
  });
});

describe("listCertificadosCliente", () => {
  it("lanza No autorizado si no es cliente", async () => {
    await expect(listCertificadosCliente(admin, AHORA)).rejects.toThrow("No autorizado");
  });

  it("mapea filas sin código ni número de expediente", async () => {
    h.filas = [fila({ venceAt: enDias(61) })];
    const [r] = await listCertificadosCliente(cliente, AHORA);
    expect(r.estado).toBe("VIGENTE");
    expect(r.diasRestantes).toBe(61);
    expect(Object.keys(r).sort()).toEqual(
      ["diasRestantes", "emitidoAt", "estado", "expedienteId", "nombreComercial", "numero", "venceAt"].sort(),
    );
    expect(h.limite).toBe(100);
  });
});

describe("listResolucionesNoCumpleCliente", () => {
  it("lanza No autorizado si no es cliente", async () => {
    await expect(listResolucionesNoCumpleCliente(admin)).rejects.toThrow("No autorizado");
  });

  it("devuelve solo id, establecimiento y fecha, sin número interno, y descarta filas sin fecha", async () => {
    const resolucionAt = new Date("2027-01-05T15:00:00Z");
    h.filas = [
      { expedienteId: "e1", nombreComercial: "Bodega Ficticia", resolucionAt, resolucionNumero: "SECRETO" },
      { expedienteId: "e2", nombreComercial: "Otra", resolucionAt: null },
    ];
    const r = await listResolucionesNoCumpleCliente(cliente);
    expect(r).toHaveLength(1);
    expect(Object.keys(r[0]).sort()).toEqual(["expedienteId", "nombreComercial", "resolucionAt"]);
    expect(h.limite).toBe(100);
  });
});
