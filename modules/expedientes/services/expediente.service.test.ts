import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
type Pred = (row: Row) => boolean;

const store = vi.hoisted(() => ({
  expedientes: [] as Row[],
  documentos: [] as Row[],
  historial: [] as Row[],
  establecimientos: [] as Row[],
  seq: 0,
  conflictos: 0,
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const orig = await importOriginal<typeof import("drizzle-orm")>();
  const key = (col: { name: string }) =>
    col.name.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  return {
    ...orig,
    eq: (col: { name: string }, v: unknown): Pred => (r) =>
      typeof v === "object" && v !== null ? true : r[key(col)] === v,
    and: (...ps: Pred[]): Pred => (r) => ps.every((p) => p(r)),
    desc: () => "desc",
    sql: (_s: TemplateStringsArray, ...values: unknown[]) => ({ isSql: true, values }),
  };
});

vi.mock("@/db", async () => {
  const { getTableName } = await import("drizzle-orm");
  const tabla = (t: object) => {
    const n = getTableName(t as never);
    return n === "expedientes"
      ? store.expedientes
      : n === "expediente_documentos"
        ? store.documentos
        : store.historial;
  };
  const siguienteNumero = (anio: unknown) => {
    const max = store.expedientes
      .map((e) => String(e.numero ?? ""))
      .filter((n) => n.startsWith(`EXP-${anio}-`))
      .reduce((m, n) => Math.max(m, Number(n.slice(9))), 0);
    return `EXP-${anio}-${String(max + 1).padStart(5, "0")}`;
  };
  return {
    db: {
      select: () => ({
        from: (t: object) => {
          const base = tabla(t);
          const consulta = (p: Pred, join: boolean) => {
            const found = () =>
              base
                .filter((r) => p(r))
                .map((r) =>
                  join
                    ? {
                        ...r,
                        establecimientoNombre: store.establecimientos.find(
                          (e) => e.id === r.establecimientoId,
                        )?.nombreComercial,
                      }
                    : r,
                );
            return {
              limit: async () => found().slice(0, 1),
              orderBy: async () => found().sort((a, b) => Number(b.seq) - Number(a.seq)),
              then: (res: (v: Row[]) => unknown) => Promise.resolve(found()).then(res),
            };
          };
          return {
            where: (p: Pred) => consulta(p, false),
            innerJoin: () => ({ where: (p: Pred) => consulta(p, true) }),
          };
        },
      }),
      insert: (t: object) => ({
        values: (v: Row) => {
          const crear = async () => {
            const row = {
              id: `id-${++store.seq}`,
              seq: store.seq,
              numero: null,
              estado: "BORRADOR",
              ...v,
            };
            tabla(t).push(row);
            return [row];
          };
          return { returning: crear, then: (res: (v: unknown) => unknown) => crear().then(res) };
        },
      }),
      update: () => ({
        set: (s: Row) => ({
          where: (p: Pred) => ({
            returning: async () => {
              const hit = store.expedientes.filter((r) => p(r));
              if (hit.length > 0 && store.conflictos > 0) {
                store.conflictos--;
                throw Object.assign(new Error("dup"), { cause: { code: "23505" } });
              }
              hit.forEach((r) => {
                const n = s.numero as { values: unknown[] } | undefined;
                Object.assign(r, s, n ? { numero: siguienteNumero(n.values[0]) } : {});
              });
              return hit;
            },
          }),
        }),
      }),
    },
  };
});

vi.mock("@/modules/establecimientos/services/establecimiento.service", () => ({
  getEstablecimientoById: async (actor: { id: string; rol: string }, id: string) =>
    store.establecimientos.find(
      (e) =>
        e.id === id &&
        !e.archivadoAt &&
        (actor.rol !== "cliente" || e.usuarioId === actor.id),
    ) ?? null,
}));

import {
  createBorrador,
  enviarExpediente,
  formatNumeroExpediente,
  getAnioLima,
  getExpedienteById,
  listOwnExpedientes,
  updateBorrador,
} from "./expediente.service";

const A = { id: "user-a", rol: "cliente" } as const;
const B = { id: "user-b", rol: "cliente" } as const;
const TIPOS = ["PLANO_UBICACION", "PLANO_DISTRIBUCION", "PLAN_SEGURIDAD", "COMPROBANTE_PAGO"];
const ESTAB = "11111111-1111-4111-8111-111111111111";

const paso1 = { establecimientoId: ESTAB, tipoTramite: "NUEVA" } as const;
const paso2 = { nivelRiesgo: "MEDIO", tieneSotano: false, almacenaInflamables: true } as const;
const paso3 = {
  solicitanteNombre: "Juan Pérez",
  solicitanteDocumento: "12345678",
  solicitanteTelefono: "987654321",
  solicitanteEmail: "juan@example.com",
} as const;
const paso4 = { numeroBoleta: "B-001" };

async function borradorCompleto(conDocs = true) {
  const e = (await createBorrador(A, paso1))!;
  await updateBorrador(A, e.id, paso2);
  await updateBorrador(A, e.id, paso3);
  await updateBorrador(A, e.id, paso4);
  if (conDocs) TIPOS.forEach((tipo) => store.documentos.push({ expedienteId: e.id, tipo }));
  return e;
}

beforeEach(() => {
  store.expedientes = [];
  store.documentos = [];
  store.historial = [];
  store.establecimientos = [
    { id: ESTAB, usuarioId: "user-a", nombreComercial: "Bodega Ficticia", archivadoAt: null },
  ];
  store.seq = 0;
  store.conflictos = 0;
});

describe("número de expediente", () => {
  it("formatea con 5 dígitos", () => {
    expect(formatNumeroExpediente(2026, 1)).toBe("EXP-2026-00001");
    expect(formatNumeroExpediente(2026, 12345)).toBe("EXP-2026-12345");
  });

  it("calcula el año en hora de Lima (31/12 23:30 Lima = 01/01 UTC)", () => {
    expect(getAnioLima(new Date("2027-01-01T04:30:00Z"))).toBe(2026);
    expect(getAnioLima(new Date("2027-01-01T05:00:00Z"))).toBe(2027);
  });
});

describe("autorización por rol", () => {
  for (const rol of ["admin", "superadmin"] as const) {
    it(`${rol}: mutaciones y listOwn lanzan No autorizado`, async () => {
      const s = { id: "staff", rol };
      await expect(createBorrador(s, paso1)).rejects.toThrow("No autorizado");
      await expect(updateBorrador(s, "x", paso4)).rejects.toThrow("No autorizado");
      await expect(enviarExpediente(s, "x", true)).rejects.toThrow("No autorizado");
      await expect(listOwnExpedientes(s)).rejects.toThrow("No autorizado");
    });

    it(`${rol}: lee cualquier expediente`, async () => {
      const e = (await createBorrador(A, paso1))!;
      expect((await getExpedienteById({ id: "staff", rol }, e.id))?.id).toBe(e.id);
    });
  }
});

describe("createBorrador", () => {
  it("usa actor.id, ignora usuarioId del input y crea BORRADOR", async () => {
    const e = await createBorrador(A, { ...paso1, usuarioId: "user-b" } as typeof paso1);
    expect(e?.usuarioId).toBe("user-a");
    expect(e?.estado).toBe("BORRADOR");
  });

  it("establecimiento ajeno, inexistente o archivado da null", async () => {
    expect(await createBorrador(B, paso1)).toBeNull();
    expect(await createBorrador(A, { ...paso1, establecimientoId: "no-existe" })).toBeNull();
    store.establecimientos[0].archivadoAt = new Date();
    expect(await createBorrador(A, paso1)).toBeNull();
  });
});

describe("updateBorrador", () => {
  it("actualiza campos del paso sin tocar estado, numero ni usuarioId", async () => {
    const e = (await createBorrador(A, paso1))!;
    const u = await updateBorrador(A, e.id, { ...paso2, estado: "ANULADO", numero: "X" } as typeof paso2);
    expect(u?.nivelRiesgo).toBe("MEDIO");
    expect(u?.almacenaInflamables).toBe(true);
    expect(u?.estado).toBe("BORRADOR");
    expect(u?.numero).toBeNull();
    expect(u?.usuarioId).toBe("user-a");
  });

  it("paso1 con establecimiento ajeno da null", async () => {
    const e = (await createBorrador(A, paso1))!;
    store.establecimientos.push({ id: "otro", usuarioId: "user-b", archivadoAt: null });
    expect(await updateBorrador(A, e.id, { ...paso1, establecimientoId: "otro" })).toBeNull();
  });

  it("null si ya no es BORRADOR", async () => {
    const e = (await createBorrador(A, paso1))!;
    store.expedientes[0].estado = "PRESENTADO";
    expect(await updateBorrador(A, e.id, paso4)).toBeNull();
  });
});

describe("IDOR", () => {
  it("cliente B no lee, edita ni envía el de A; igual que id inexistente", async () => {
    const e = await borradorCompleto();
    const before = structuredClone(store);

    expect(await getExpedienteById(B, e.id)).toBeNull();
    expect(await updateBorrador(B, e.id, paso4)).toBeNull();
    expect(await enviarExpediente(B, e.id, true)).toEqual({ status: "no_encontrado" });
    expect(store).toEqual(before);

    expect(await getExpedienteById(A, "no-existe")).toBeNull();
    expect(await updateBorrador(A, "no-existe", paso4)).toBeNull();
    expect(await enviarExpediente(A, "no-existe", true)).toEqual({ status: "no_encontrado" });
  });
});

describe("listOwnExpedientes", () => {
  it("devuelve solo los propios, recientes primero, con nombre del establecimiento", async () => {
    const e1 = (await createBorrador(A, paso1))!;
    const e2 = (await createBorrador(A, paso1))!;
    store.expedientes.push({ id: "ajeno", seq: 99, usuarioId: "user-b", establecimientoId: ESTAB });
    const lista = await listOwnExpedientes(A);
    expect(lista.map((r) => r.id)).toEqual([e2.id, e1.id]);
    expect(lista[0].establecimientoNombre).toBe("Bodega Ficticia");
  });
});

describe("enviarExpediente", () => {
  it("presenta: número, fecha e historial", async () => {
    const e = await borradorCompleto();
    const r = await enviarExpediente(A, e.id, true);
    expect(r.status).toBe("ok");
    const row = store.expedientes[0];
    expect(row.estado).toBe("PRESENTADO");
    expect(row.numero).toBe(`EXP-${getAnioLima()}-00001`);
    expect(row.presentadoAt).toBeInstanceOf(Date);
    expect(store.historial).toEqual([
      expect.objectContaining({
        expedienteId: e.id,
        estadoAnterior: "BORRADOR",
        estadoNuevo: "PRESENTADO",
        usuarioId: "user-a",
        comentario: "Solicitud presentada",
      }),
    ]);
  });

  it("correlativo sigue al máximo", async () => {
    const e1 = await borradorCompleto();
    const e2 = await borradorCompleto();
    await enviarExpediente(A, e1.id, true);
    await enviarExpediente(A, e2.id, true);
    expect(store.expedientes[1].numero).toBe(`EXP-${getAnioLima()}-00002`);
  });

  it("segundo envío da no_encontrado y no consume número", async () => {
    const e = await borradorCompleto();
    await enviarExpediente(A, e.id, true);
    expect(await enviarExpediente(A, e.id, true)).toEqual({ status: "no_encontrado" });
    expect(store.historial).toHaveLength(1);
  });

  it("incompleto sin modificar: declaración no aceptada", async () => {
    const e = await borradorCompleto();
    const r = await enviarExpediente(A, e.id, false);
    expect(r).toEqual({ status: "incompleto", faltantes: ["declaracion"] });
    expect(store.expedientes[0].estado).toBe("BORRADOR");
    expect(store.historial).toHaveLength(0);
  });

  it("incompleto: faltan pasos y documentos", async () => {
    const e = (await createBorrador(A, paso1))!;
    const r = await enviarExpediente(A, e.id, true);
    expect(r).toMatchObject({ status: "incompleto" });
    if (r.status === "incompleto") {
      expect(r.faltantes).toEqual(expect.arrayContaining(["paso2", "paso3", "paso4", ...TIPOS]));
      expect(r.faltantes).not.toContain("paso1");
    }
    expect(store.expedientes[0].estado).toBe("BORRADOR");
  });

  it("incompleto: falta un documento requerido", async () => {
    const e = await borradorCompleto();
    store.documentos.pop();
    expect(await enviarExpediente(A, e.id, true)).toEqual({
      status: "incompleto",
      faltantes: ["COMPROBANTE_PAGO"],
    });
  });

  it("incompleto: establecimiento archivado", async () => {
    const e = await borradorCompleto();
    store.establecimientos[0].archivadoAt = new Date();
    expect(await enviarExpediente(A, e.id, true)).toEqual({
      status: "incompleto",
      faltantes: ["establecimiento"],
    });
  });

  it("reintenta ante choque del índice único", async () => {
    const e = await borradorCompleto();
    store.conflictos = 2;
    expect((await enviarExpediente(A, e.id, true)).status).toBe("ok");
    expect(store.historial).toHaveLength(1);
  });

  it("lanza tras 3 choques", async () => {
    const e = await borradorCompleto();
    store.conflictos = 3;
    await expect(enviarExpediente(A, e.id, true)).rejects.toThrow("dup");
    expect(store.expedientes[0].estado).toBe("BORRADOR");
  });
});
