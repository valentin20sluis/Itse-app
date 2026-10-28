import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
type Pred = (row: Row, outer?: Row) => boolean;

const store = vi.hoisted(() => ({ expedientes: [] as Row[], docs: [] as Row[], seq: 0 }));

vi.mock("drizzle-orm", () => {
  const key = (col: { name: string }) =>
    col.name.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  const isCol = (v: unknown): v is { name: string } =>
    typeof v === "object" && v !== null && "name" in v;
  return {
    eq: (col: { name: string }, v: unknown): Pred => (r, o) =>
      r[key(col)] === (isCol(v) ? o?.[key(v)] : v),
    and: (...ps: Pred[]): Pred => (r, o) => ps.every((p) => p(r, o)),
    inArray: (col: { name: string }, vs: unknown[]): Pred => (r) => vs.includes(r[key(col)]),
    isNull: (col: { name: string }): Pred => (r) => r[key(col)] == null,
    gt: (col: { name: string }, v: Date): Pred => (r) => (r[key(col)] as Date | null | undefined) != null && (r[key(col)] as Date) > v,
    exists: (sub: { pred: Pred }): Pred => (r) => store.expedientes.some((e) => sub.pred(e, r)),
  };
});

vi.mock("@/db", () => {
  const rowsOf = (table: object) => ("fileKey" in table ? store.docs : store.expedientes);
  return {
    db: {
      select: () => ({
        from: (table: object) => ({
          where: (p: Pred) => {
            const hit = rowsOf(table)
              .filter((r) => p(r))
              .map((r) => ({ ...r }));
            return Object.assign(Promise.resolve(hit), {
              pred: p,
              limit: async () => hit.slice(0, 1),
            });
          },
        }),
      }),
      insert: () => ({
        values: (v: Row) => ({
          onConflictDoUpdate: ({ set }: { set: Row }) => ({
            returning: async () => {
              const prev = store.docs.find(
                (d) => d.expedienteId === v.expedienteId && d.tipo === v.tipo,
              );
              if (prev) return [Object.assign(prev, set)];
              const row = { id: `doc-${++store.seq}`, ...v };
              store.docs.push(row);
              return [row];
            },
          }),
        }),
      }),
      delete: () => ({
        where: (p: Pred) => ({
          returning: async () => {
            const hit = store.docs.filter((d) => p(d, d));
            store.docs = store.docs.filter((d) => !hit.includes(d));
            return hit;
          },
        }),
      }),
    },
  };
});

import {
  getDocumentoForDownload,
  listDocumentos,
  puedeSubirDocumento,
  registerDocumento,
  removeDocumento,
} from "./documento.service";

const A = { id: "user-a", rol: "cliente" } as const;
const B = { id: "user-b", rol: "cliente" } as const;
const pdf = {
  tipo: "FICHA_RUC",
  fileKey: "key-1",
  nombreOriginal: "plano.pdf",
  mimeType: "application/pdf",
  tamanoBytes: 1000,
} as const;

const LIMITE = new Date("2026-11-02T05:00:00.000Z");
const subsanando = {
  estado: "EN_SUBSANACION",
  nivelRiesgo: "BAJO",
  subsanacionPresentadaAt: null,
  subsanacionLimite: LIMITE,
};
const dj = { ...pdf, tipo: "SUBSANACION_DECLARACION_JURADA" } as const;
const panel = { ...pdf, tipo: "SUBSANACION_PANEL_FOTOGRAFICO" } as const;
const AHORA = new Date("2026-10-30T15:00:00.000Z");

beforeEach(() => {
  store.expedientes = [
    { id: "exp-1", usuarioId: "user-a", estado: "BORRADOR" },
    { id: "exp-2", usuarioId: "user-a", estado: "PRESENTADO" },
    { id: "exp-3", usuarioId: "user-a", estado: "OBSERVADO_REQUISITOS" },
    { id: "exp-4", usuarioId: "user-a", estado: "EN_REVISION" },
    { id: "exp-5", usuarioId: "user-a", ...subsanando },
  ];
  store.docs = [];
  store.seq = 0;
});

describe("registerDocumento", () => {
  it("registra un archivo válido", async () => {
    const r = await registerDocumento(A, "exp-1", pdf);
    expect(r).toMatchObject({ status: "ok", previousFileKey: null });
    expect(store.docs).toHaveLength(1);
    expect(store.docs[0]).toMatchObject({ expedienteId: "exp-1", fileKey: "key-1" });
  });

  it("rechaza un archivo inválido sin guardar", async () => {
    const r = await registerDocumento(A, "exp-1", { ...pdf, mimeType: "text/html" });
    expect(r).toMatchObject({ status: "invalido" });
    expect(store.docs).toHaveLength(0);
  });

  it("reemplaza el mismo tipo y devuelve la clave anterior", async () => {
    await registerDocumento(A, "exp-1", pdf);
    const r = await registerDocumento(A, "exp-1", { ...pdf, fileKey: "key-2" });
    expect(r).toMatchObject({ status: "ok", previousFileKey: "key-1" });
    expect(store.docs).toHaveLength(1);
    expect(store.docs[0].fileKey).toBe("key-2");
  });

  it("no registra en un expediente presentado ni en revisión", async () => {
    expect(await registerDocumento(A, "exp-2", pdf)).toBeNull();
    expect(await registerDocumento(A, "exp-4", pdf)).toBeNull();
    expect(store.docs).toHaveLength(0);
  });

  it("registra en un expediente observado", async () => {
    expect(await registerDocumento(A, "exp-3", pdf)).toMatchObject({ status: "ok" });
    expect(store.docs).toHaveLength(1);
  });
});

describe("IDOR", () => {
  it("otro cliente no registra, borra, lista ni descarga; igual que inexistente", async () => {
    await registerDocumento(A, "exp-1", pdf);
    const before = structuredClone(store.docs);

    expect(await registerDocumento(B, "exp-1", { ...pdf, fileKey: "hack" })).toBeNull();
    expect(await removeDocumento(B, "exp-1", "FICHA_RUC")).toBeNull();
    expect(await listDocumentos(B, "exp-1")).toEqual([]);
    expect(await getDocumentoForDownload(B, "exp-1", "FICHA_RUC")).toBeNull();
    expect(store.docs).toEqual(before);

    expect(await registerDocumento(A, "no-existe", pdf)).toBeNull();
    expect(await removeDocumento(A, "no-existe", "FICHA_RUC")).toBeNull();
    expect(await listDocumentos(A, "no-existe")).toEqual([]);
    expect(await getDocumentoForDownload(A, "no-existe", "FICHA_RUC")).toBeNull();
  });
});

describe("removeDocumento", () => {
  it("el dueño elimina en borrador y recibe la fila", async () => {
    await registerDocumento(A, "exp-1", pdf);
    expect((await removeDocumento(A, "exp-1", "FICHA_RUC"))?.fileKey).toBe("key-1");
    expect(store.docs).toHaveLength(0);
  });

  it("no elimina en un expediente presentado ni en revisión", async () => {
    store.docs = [
      { id: "d", expedienteId: "exp-2", tipo: "FICHA_RUC", fileKey: "k" },
      { id: "e", expedienteId: "exp-4", tipo: "FICHA_RUC", fileKey: "k" },
    ];
    expect(await removeDocumento(A, "exp-2", "FICHA_RUC")).toBeNull();
    expect(await removeDocumento(A, "exp-4", "FICHA_RUC")).toBeNull();
    expect(store.docs).toHaveLength(2);
  });

  it("elimina en un expediente observado", async () => {
    store.docs = [{ id: "d", expedienteId: "exp-3", tipo: "FICHA_RUC", fileKey: "k" }];
    expect((await removeDocumento(A, "exp-3", "FICHA_RUC"))?.fileKey).toBe("k");
    expect(store.docs).toHaveLength(0);
  });
});

describe("lectura y descarga", () => {
  it("el dueño y el staff listan y descargan", async () => {
    await registerDocumento(A, "exp-1", pdf);
    for (const actor of [A, { id: "s", rol: "admin" }, { id: "s", rol: "superadmin" }] as const) {
      expect(await listDocumentos(actor, "exp-1")).toHaveLength(1);
      expect((await getDocumentoForDownload(actor, "exp-1", "FICHA_RUC"))?.fileKey).toBe(
        "key-1",
      );
    }
    expect(await getDocumentoForDownload(A, "exp-1", "POZO_TIERRA")).toBeNull();
  });
});

describe("autorización por rol", () => {
  for (const rol of ["admin", "superadmin"] as const) {
    it(`${rol}: registrar y eliminar lanzan No autorizado`, async () => {
      const staff = { id: "s", rol };
      await expect(registerDocumento(staff, "exp-1", pdf)).rejects.toThrow("No autorizado");
      await expect(removeDocumento(staff, "exp-1", "FICHA_RUC")).rejects.toThrow(
        "No autorizado",
      );
    });
  }
});

describe("documentos de subsanación", () => {
  const fila = (id: string, extra: Row) => ({ id, usuarioId: "user-a", ...subsanando, ...extra });

  it("registra y reemplaza en EN_SUBSANACION de posterior, vigente y sin presentar", async () => {
    expect(await registerDocumento(A, "exp-5", dj, AHORA)).toMatchObject({ status: "ok" });
    expect(await registerDocumento(A, "exp-5", panel, AHORA)).toMatchObject({ status: "ok" });
    expect(
      await registerDocumento(A, "exp-5", { ...dj, fileKey: "k2" }, AHORA),
    ).toMatchObject({ status: "ok", previousFileKey: "key-1" });
    expect(store.docs).toHaveLength(2);
  });

  it.each([
    ["otro estado", { estado: "PRESENTADO" }],
    ["riesgo alto", { nivelRiesgo: "ALTO" }],
    ["riesgo muy alto", { nivelRiesgo: "MUY_ALTO" }],
    ["riesgo nulo", { nivelRiesgo: null }],
    ["ya presentada", { subsanacionPresentadaAt: new Date("2026-10-29T15:00:00.000Z") }],
    ["sin límite", { subsanacionLimite: null }],
    ["vencida (límite + 1 día)", { subsanacionLimite: new Date("2026-10-29T05:00:00.000Z") }],
  ])("rechaza sin escribir: %s", async (_n, extra) => {
    store.expedientes = [fila("exp-x", extra)];
    store.docs = [{ id: "d", expedienteId: "exp-x", tipo: dj.tipo, fileKey: "k" }];
    expect(await puedeSubirDocumento(A, "exp-x", dj.tipo, AHORA)).toBe(false);
    expect(await registerDocumento(A, "exp-x", dj, AHORA)).toBeNull();
    expect(await removeDocumento(A, "exp-x", dj.tipo, AHORA)).toBeNull();
    expect(store.docs).toHaveLength(1);
  });

  it("el último día del plazo todavía vale completo", async () => {
    const finDelDia = new Date("2026-11-03T04:59:00.000Z");
    expect(await puedeSubirDocumento(A, "exp-5", dj.tipo, finDelDia)).toBe(true);
    expect(await puedeSubirDocumento(A, "exp-5", dj.tipo, new Date("2026-11-03T05:00:00.000Z"))).toBe(
      false,
    );
  });

  it("quita el archivo mientras no esté presentada", async () => {
    store.docs = [{ id: "d", expedienteId: "exp-5", tipo: dj.tipo, fileKey: "k" }];
    expect((await removeDocumento(A, "exp-5", dj.tipo, AHORA))?.fileKey).toBe("k");
  });

  it("los tipos de requisitos no se suben en EN_SUBSANACION, ni los de subsanación en BORRADOR", async () => {
    expect(await registerDocumento(A, "exp-5", pdf, AHORA)).toBeNull();
    expect(await registerDocumento(A, "exp-1", dj, AHORA)).toBeNull();
    expect(await registerDocumento(A, "exp-3", panel, AHORA)).toBeNull();
    expect(store.docs).toHaveLength(0);
  });

  it("otro cliente no sube ni quita; el personal lanza No autorizado", async () => {
    store.docs = [{ id: "d", expedienteId: "exp-5", tipo: dj.tipo, fileKey: "k" }];
    expect(await registerDocumento(B, "exp-5", dj, AHORA)).toBeNull();
    expect(await removeDocumento(B, "exp-5", dj.tipo, AHORA)).toBeNull();
    expect(await puedeSubirDocumento(B, "exp-5", dj.tipo, AHORA)).toBe(false);
    for (const rol of ["admin", "superadmin"] as const) {
      await expect(puedeSubirDocumento({ id: "s", rol }, "exp-5", dj.tipo, AHORA)).rejects.toThrow(
        "No autorizado",
      );
    }
    expect(store.docs).toHaveLength(1);
  });
});
