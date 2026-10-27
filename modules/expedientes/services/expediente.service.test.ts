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
    inArray: (col: { name: string }, vs: unknown[]): Pred => (r) => vs.includes(r[key(col)]),
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
                        numeroPisos: store.establecimientos.find(
                          (e) => e.id === r.establecimientoId,
                        )?.numeroPisos,
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
  formatNumeroExpediente,
  getAnioLima,
  getExpedienteById,
  guardarSesionPago,
  listOwnExpedientes,
  prepararPago,
  presentarExpediente,
  updateBorrador,
} from "./expediente.service";

const A = { id: "user-a", rol: "cliente" } as const;
const B = { id: "user-b", rol: "cliente" } as const;
const TIPOS = ["DNI_AMBAS_CARAS", "FICHA_RUC", "EXTINTORES_PQS", "CAPACITACION_EXTINTORES"];
const TECNICOS = ["PLANO_ARQUITECTURA_AFORO", "PLANOS_ELECTRICOS", "POZO_TIERRA", "MEMORIA_PRUEBAS_EQUIPOS"];
const ESTAB = "11111111-1111-4111-8111-111111111111";

const paso1 = { establecimientoId: ESTAB, tipoTramite: "NUEVA" } as const;
const paso2 = {
  nivelRiesgo: "MEDIO",
  tieneSotano: false,
  almacenaInflamables: true,
  tieneCocina: false,
  esGrifo: false,
  usoMixtoPatrimonio: false,
  granEscala: false,
} as const;
const paso3 = {
  solicitanteNombre: "Juan Pérez",
  solicitanteDocumento: "12345678",
  solicitanteTelefono: "987654321",
  solicitanteEmail: "juan@example.com",
  calidadSolicitante: "PROPIETARIO",
} as const;
const pago = () => ({ stripeSessionId: "cs_test_abc", pagadoAt: new Date() });

async function borradorCompleto(conDocs = true) {
  const e = (await createBorrador(A, paso1))!;
  await updateBorrador(A, e.id, paso2);
  await updateBorrador(A, e.id, paso3);
  if (conDocs) TIPOS.forEach((tipo) => store.documentos.push({ expedienteId: e.id, tipo }));
  return e;
}

beforeEach(() => {
  store.expedientes = [];
  store.documentos = [];
  store.historial = [];
  store.establecimientos = [
    { id: ESTAB, usuarioId: "user-a", nombreComercial: "Bodega Ficticia", numeroPisos: 1, archivadoAt: null },
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
      await expect(updateBorrador(s, "x", paso3)).rejects.toThrow("No autorizado");
      await expect(prepararPago(s, "x", true)).rejects.toThrow("No autorizado");
      await expect(presentarExpediente(s, "x", pago())).rejects.toThrow("No autorizado");
      await expect(guardarSesionPago(s, "x", "cs_test_a")).rejects.toThrow("No autorizado");
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
    expect(u?.tieneCocina).toBe(false);
    expect(u?.esGrifo).toBe(false);
    expect(u?.estado).toBe("BORRADOR");
    expect(u?.numero).toBeNull();
    expect(u?.usuarioId).toBe("user-a");
  });

  it("paso 2 persiste usoMixtoPatrimonio y granEscala", async () => {
    const e = (await createBorrador(A, paso1))!;
    const u = await updateBorrador(A, e.id, { ...paso2, usoMixtoPatrimonio: true, granEscala: true });
    expect(u?.usoMixtoPatrimonio).toBe(true);
    expect(u?.granEscala).toBe(true);
  });

  it("paso 2 persiste tieneCocina y esGrifo", async () => {
    const e = (await createBorrador(A, paso1))!;
    const u = await updateBorrador(A, e.id, { ...paso2, tieneCocina: true, esGrifo: true });
    expect(u?.tieneCocina).toBe(true);
    expect(u?.esGrifo).toBe(true);
  });

  it("paso 3 persiste calidadSolicitante", async () => {
    const e = (await createBorrador(A, paso1))!;
    const u = await updateBorrador(A, e.id, { ...paso3, calidadSolicitante: "ADMINISTRADOR" });
    expect(u?.calidadSolicitante).toBe("ADMINISTRADOR");
  });

  it("paso1 con establecimiento ajeno da null", async () => {
    const e = (await createBorrador(A, paso1))!;
    store.establecimientos.push({ id: "otro", usuarioId: "user-b", archivadoAt: null });
    expect(await updateBorrador(A, e.id, { ...paso1, establecimientoId: "otro" })).toBeNull();
  });

  it("null si ya no es BORRADOR", async () => {
    const e = (await createBorrador(A, paso1))!;
    store.expedientes[0].estado = "PRESENTADO";
    expect(await updateBorrador(A, e.id, paso3)).toBeNull();
  });
});

describe("IDOR", () => {
  it("cliente B no lee, edita ni envía el de A; igual que id inexistente", async () => {
    const e = await borradorCompleto();
    const before = structuredClone(store);

    expect(await getExpedienteById(B, e.id)).toBeNull();
    expect(await updateBorrador(B, e.id, paso3)).toBeNull();
    expect(await prepararPago(B, e.id, true)).toEqual({ status: "no_encontrado" });
    expect(await presentarExpediente(B, e.id, pago())).toEqual({ status: "no_encontrado" });
    expect(await guardarSesionPago(B, e.id, "cs_test_a")).toBe(false);
    expect(store).toEqual(before);

    expect(await getExpedienteById(A, "no-existe")).toBeNull();
    expect(await updateBorrador(A, "no-existe", paso3)).toBeNull();
    expect(await prepararPago(A, "no-existe", true)).toEqual({ status: "no_encontrado" });
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

  it("pagoPendiente solo en borradores completos", async () => {
    const completo = await borradorCompleto();
    const incompleto = (await createBorrador(A, paso1))!;
    const presentado = await borradorCompleto();
    await presentarExpediente(A, presentado.id, pago());
    const lista = await listOwnExpedientes(A);
    const pend = (id: string) => lista.find((r) => r.id === id)?.pagoPendiente;
    expect(pend(completo.id)).toBe(true);
    expect(pend(incompleto.id)).toBe(false);
    expect(pend(presentado.id)).toBe(false);
  });
});

describe("prepararPago", () => {
  it("borrador completo: guarda la declaración y no cambia el estado", async () => {
    const e = await borradorCompleto();
    const r = await prepararPago(A, e.id, true);
    expect(r.status).toBe("ok");
    expect(store.expedientes[0].declaracionAceptadaAt).toBeInstanceOf(Date);
    expect(store.expedientes[0].estado).toBe("BORRADOR");
    expect(store.expedientes[0].numero).toBeNull();
    expect(store.historial).toHaveLength(0);
  });

  it("incompleto sin modificar: declaración no aceptada", async () => {
    const e = await borradorCompleto();
    expect(await prepararPago(A, e.id, false)).toEqual({
      status: "incompleto",
      faltantes: ["declaracion"],
    });
    expect(store.expedientes[0].declaracionAceptadaAt).toBeUndefined();
  });

  it("incompleto: faltan pasos y documentos", async () => {
    const e = (await createBorrador(A, paso1))!;
    const r = await prepararPago(A, e.id, true);
    expect(r).toMatchObject({ status: "incompleto" });
    if (r.status === "incompleto") expect(r.faltantes).toEqual(["paso2", "paso3"]);
  });

  it("incompleto: falta un documento requerido", async () => {
    const e = await borradorCompleto();
    store.documentos.pop();
    expect(await prepararPago(A, e.id, true)).toEqual({
      status: "incompleto",
      faltantes: ["CAPACITACION_EXTINTORES"],
    });
  });

  it("incompleto: falta el DNI", async () => {
    const e = await borradorCompleto();
    store.documentos = store.documentos.filter((d) => d.tipo !== "DNI_AMBAS_CARAS");
    expect(await prepararPago(A, e.id, true)).toEqual({
      status: "incompleto",
      faltantes: ["DNI_AMBAS_CARAS"],
    });
  });

  it("representante sin acreditación: incompleto; con acreditación: ok", async () => {
    const e = await borradorCompleto();
    await updateBorrador(A, e.id, { ...paso3, calidadSolicitante: "REPRESENTANTE_LEGAL" });
    expect(await prepararPago(A, e.id, true)).toEqual({
      status: "incompleto",
      faltantes: ["ACREDITACION_REPRESENTACION"],
    });
    store.documentos.push({ expedienteId: e.id, tipo: "ACREDITACION_REPRESENTACION" });
    expect((await prepararPago(A, e.id, true)).status).toBe("ok");
  });

  it("riesgo ALTO con solo los básicos: faltan el plan y los técnicos", async () => {
    const e = await borradorCompleto();
    await updateBorrador(A, e.id, { ...paso2, nivelRiesgo: "ALTO" });
    expect(await prepararPago(A, e.id, true)).toEqual({
      status: "incompleto",
      faltantes: ["PLAN_SEGURIDAD", ...TECNICOS],
    });
  });

  it("documentos subidos que ya no son requeridos no bloquean", async () => {
    const e = await borradorCompleto();
    TECNICOS.forEach((tipo) => store.documentos.push({ expedienteId: e.id, tipo }));
    expect((await prepararPago(A, e.id, true)).status).toBe("ok");
  });

  it("incompleto: establecimiento archivado", async () => {
    const e = await borradorCompleto();
    store.establecimientos[0].archivadoAt = new Date();
    expect(await prepararPago(A, e.id, true)).toEqual({
      status: "incompleto",
      faltantes: ["establecimiento"],
    });
  });

  it("no BORRADOR: no_encontrado", async () => {
    const e = await borradorCompleto();
    store.expedientes[0].estado = "PRESENTADO";
    expect(await prepararPago(A, e.id, true)).toEqual({ status: "no_encontrado" });
  });
});

describe("guardarSesionPago", () => {
  it("guarda la sesión en el borrador propio", async () => {
    const e = (await createBorrador(A, paso1))!;
    expect(await guardarSesionPago(A, e.id, "cs_test_a")).toBe(true);
    expect(store.expedientes[0].stripeSessionId).toBe("cs_test_a");
  });

  it("false si ya no es BORRADOR", async () => {
    const e = (await createBorrador(A, paso1))!;
    store.expedientes[0].estado = "PRESENTADO";
    expect(await guardarSesionPago(A, e.id, "cs_test_a")).toBe(false);
  });
});

describe("presentarExpediente", () => {
  it("presenta: número, pago, fecha e historial", async () => {
    const e = await borradorCompleto();
    const r = await presentarExpediente(A, e.id, pago());
    expect(r.status).toBe("ok");
    const row = store.expedientes[0];
    expect(row.estado).toBe("PRESENTADO");
    expect(row.numero).toBe(`EXP-${getAnioLima()}-00001`);
    expect(row.stripeSessionId).toBe("cs_test_abc");
    expect(row.pagadoAt).toBeInstanceOf(Date);
    expect(row.presentadoAt).toBeInstanceOf(Date);
    expect(store.historial).toEqual([
      expect.objectContaining({
        expedienteId: e.id,
        estadoAnterior: "BORRADOR",
        estadoNuevo: "PRESENTADO",
        usuarioId: "user-a",
        comentario: "Solicitud presentada con pago en línea",
      }),
    ]);
  });

  it("correlativo sigue al máximo", async () => {
    const e1 = await borradorCompleto();
    const e2 = await borradorCompleto();
    await presentarExpediente(A, e1.id, pago());
    await presentarExpediente(A, e2.id, pago());
    expect(store.expedientes[1].numero).toBe(`EXP-${getAnioLima()}-00002`);
  });

  it("segunda vez da no_encontrado y no consume número", async () => {
    const e = await borradorCompleto();
    await presentarExpediente(A, e.id, pago());
    expect(await presentarExpediente(A, e.id, pago())).toEqual({ status: "no_encontrado" });
    expect(store.historial).toHaveLength(1);
  });

  it("reintenta ante choque del índice único", async () => {
    const e = await borradorCompleto();
    store.conflictos = 2;
    expect((await presentarExpediente(A, e.id, pago())).status).toBe("ok");
    expect(store.historial).toHaveLength(1);
  });

  it("lanza tras 3 choques", async () => {
    const e = await borradorCompleto();
    store.conflictos = 3;
    await expect(presentarExpediente(A, e.id, pago())).rejects.toThrow("dup");
    expect(store.expedientes[0].estado).toBe("BORRADOR");
  });
});
