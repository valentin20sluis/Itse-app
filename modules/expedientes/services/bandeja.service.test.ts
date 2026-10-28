import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ resultados: [] as unknown[], ilike: vi.fn(), inArray: vi.fn(), eq: vi.fn() }));

vi.mock("drizzle-orm", async (importOriginal) => {
  const orig = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...orig,
    inArray: (...args: unknown[]) => (mocks.inArray(...args), orig.inArray(...(args as [never, never]))),
    eq: (...args: unknown[]) => (mocks.eq(...args), orig.eq(...(args as [never, never]))),
    ilike: (...args: unknown[]) => (mocks.ilike(...args), orig.ilike(...(args as [never, never]))) };
});

// Cada consulta se resuelve en el orden en que se inicia, con el siguiente resultado encolado.
vi.mock("@/db", () => {
  const consulta = () => {
    const resultado = mocks.resultados.shift();
    const q: Record<string, unknown> = {
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
        Promise.resolve(resultado).then(res, rej),
    };
    for (const m of ["from", "innerJoin", "leftJoin", "where", "orderBy", "limit", "offset"]) {
      q[m] = () => q;
    }
    return q;
  };
  return { db: { select: consulta } };
});

import {
  getExpedienteDetalle,
  listExpedientesPanel,
} from "@/modules/expedientes/services/bandeja.service";

const admin = { id: "a1", rol: "admin" } as const;
const cliente = { id: "c1", rol: "cliente" } as const;

const fila = (extra = {}) => ({
  id: "e1",
  numero: "EXP-2026-00001",
  establecimientoNombre: "Bodega",
  nombres: "Ana",
  apellidos: "Pérez",
  email: "ana@x.pe",
  tipoTramite: "NUEVA",
  nivelRiesgo: "ALTO",
  estado: "PRESENTADO",
  presentadoAt: new Date("2026-01-01"),
  ...extra,
});

beforeEach(() => {
  mocks.resultados = [];
  mocks.ilike.mockClear();
  mocks.inArray.mockClear();
  mocks.eq.mockClear();
});

describe("listExpedientesPanel", () => {
  it("rechaza al cliente", async () => {
    await expect(listExpedientesPanel(cliente, { page: 1 })).rejects.toThrow("No autorizado");
  });

  it.each([admin, { id: "s1", rol: "superadmin" } as const])("lo lee $rol", async (actor) => {
    mocks.resultados = [[fila()], [{ total: 41 }]];
    const r = await listExpedientesPanel(actor, { page: 2 });
    expect(r).toMatchObject({ total: 41, page: 2, pageSize: 20 });
    expect(r.items[0]).toMatchObject({ id: "e1", numero: "EXP-2026-00001", clienteNombre: "Ana Pérez" });
    expect(r.items[0]).not.toHaveProperty("email");
  });

  it("usa el email si no hay nombres", async () => {
    mocks.resultados = [[fila({ nombres: "", apellidos: "" })], [{ total: 1 }]];
    const r = await listExpedientesPanel(admin, { page: 1 });
    expect(r.items[0].clienteNombre).toBe("ana@x.pe");
  });

  it("pendientes=jefatura rechaza al cliente", async () => {
    await expect(listExpedientesPanel(cliente, { page: 1, pendientes: "jefatura" })).rejects.toThrow(
      "No autorizado",
    );
  });

  it("pendientes=jefatura filtra por los tres estados y gana sobre estado", async () => {
    mocks.resultados = [[fila()], [{ total: 1 }]];
    mocks.eq.mockClear();
    await listExpedientesPanel(admin, { page: 1, pendientes: "jefatura", estado: "PRESENTADO" });
    expect(mocks.inArray).toHaveBeenCalledTimes(1);
    expect(mocks.inArray.mock.calls[0][1]).toEqual([
      "ENVIADO_JEFATURA",
      "CERTIFICADO_PENDIENTE_FIRMA",
      "NO_CUMPLE",
    ]);
    expect(mocks.eq.mock.calls.some((c) => c[1] === "PRESENTADO")).toBe(false);
  });

  it("sin pendientes no usa inArray", async () => {
    mocks.resultados = [[], [{ total: 0 }]];
    await listExpedientesPanel(admin, { page: 1, estado: "PRESENTADO" });
    expect(mocks.inArray).not.toHaveBeenCalled();
  });

  it("escapa % y _ en la búsqueda", async () => {
    mocks.resultados = [[], [{ total: 0 }]];
    await listExpedientesPanel(admin, { page: 1, q: "50%_a" });
    expect(mocks.ilike.mock.calls[0][1]).toBe("%50\\%\\_a%");
  });
});

describe("getExpedienteDetalle", () => {
  const exp = {
    id: "e1",
    numero: "EXP-2026-00001",
    solicitanteNombre: "Luis",
    solicitanteDocumento: "12345678",
    solicitanteTelefono: "999",
    solicitanteEmail: "l@x.pe",
    calidadSolicitante: "PROPIETARIO",
    razonSocial: null,
  };
  const historial = [
    { id: "h1", estadoAnterior: null, estadoNuevo: "PRESENTADO", comentario: null, createdAt: new Date(), nombres: "Ana", apellidos: "Pérez", email: "a@x.pe" },
    { id: "h2", estadoAnterior: "PRESENTADO", estadoNuevo: "EN_REVISION", comentario: null, createdAt: new Date(), nombres: "", apellidos: "", email: "b@x.pe" },
  ];

  it("devuelve null si no hay fila (inexistente, sin número o cliente ajeno)", async () => {
    mocks.resultados = [[]];
    expect(await getExpedienteDetalle(cliente, "e1")).toBeNull();
    mocks.resultados = [[]];
    expect(await getExpedienteDetalle(admin, "e1")).toBeNull();
  });

  it("incluye actorNombre para staff y mantiene el orden", async () => {
    mocks.resultados = [[{ expediente: exp, establecimiento: { id: "s" } }], [{ id: "d1" }], historial];
    const d = await getExpedienteDetalle(admin, "e1");
    expect(d?.solicitante).toMatchObject({ nombre: "Luis", documento: "12345678", calidad: "PROPIETARIO" });
    expect(d?.documentos).toHaveLength(1);
    expect(d?.historial.map((h) => h.id)).toEqual(["h1", "h2"]);
    expect(d?.historial.map((h) => h.actorNombre)).toEqual(["Ana Pérez", "b@x.pe"]);
  });

  it("omite actorNombre para el cliente", async () => {
    mocks.resultados = [[{ expediente: exp, establecimiento: { id: "s" } }], [], historial];
    const d = await getExpedienteDetalle(cliente, "e1");
    expect(d?.historial.every((h) => h.actorNombre === undefined)).toBe(true);
  });
});
